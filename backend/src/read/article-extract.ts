/**
 * Readability without dependencies: build a forgiving element tree, drop chrome (nav, ads, comments), pick the
 * container holding the most paragraph text and return its blocks in document order. Never executes or keeps
 * markup; output is plain text only.
 */
export type SegmentKind = 'heading' | 'paragraph' | 'list-item' | 'quote'
export interface ArticleSegment { id: string; text: string; kind: SegmentKind }
export interface Article { title: string; segments: ArticleSegment[]; truncated: boolean }

export const MIN_ARTICLE_CHARS = 200
export const MAX_ARTICLE_CHARS = 100000
const MAX_SEGMENTS = 2000
const MIN_PARAGRAPH_CHARS = 25

interface Element { tag: string; attrs: string; children: Node[]; parent: Element | null; depth: number }
type Node = Element | string

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
// Content of these is never article text; skipping to the end tag also keeps `<` inside scripts out of the tokenizer.
const RAW = new Set(['script', 'style', 'noscript', 'template', 'textarea', 'title', 'svg', 'math', 'iframe', 'object', 'canvas', 'select', 'button'])
const DROP = new Set(['nav', 'header', 'footer', 'aside', 'form', 'figure', 'dialog', 'menu', 'head'])
const CLOSES_P = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'blockquote', 'pre', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'figure', 'hr', 'dl', 'dd', 'dt'])
const BLOCK_KIND: Record<string, SegmentKind> = {
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  p: 'paragraph', pre: 'paragraph', dd: 'paragraph', dt: 'paragraph', tr: 'paragraph', li: 'list-item', blockquote: 'quote',
}
const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'font', 'i', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'])
const NOISE = /(?:^|[\s_-])(?:comments?|share|sharing|social|related|recommend\w*|promo\w*|advert\w*|ads?|banner|sidebar|newsletter|subscribe|cookie\w*|breadcrumbs?|popup|modal|navbar|menu|tags?)(?:$|[\s_-])/i
// Deeper nesting is flattened so recursion below cannot overflow the stack on a hostile page.
const MAX_DEPTH = 256

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', reg: '®', deg: '°', middot: '·', bull: '•', times: '×',
}
// Older Vietnamese sites still write vowels as Latin-1 entities (&agrave;, &ecirc;…); these names are case-sensitive.
const LATIN1 = ['Agrave', 'Aacute', 'Acirc', 'Atilde', '', '', '', '', 'Egrave', 'Eacute', 'Ecirc', '', 'Igrave', 'Iacute', '', '', '', '', 'Ograve', 'Oacute', 'Ocirc', 'Otilde', '', '', '', 'Ugrave', 'Uacute', '', '', 'Yacute']
LATIN1.forEach((name, index) => {
  if (!name) return
  NAMED[name] = String.fromCodePoint(0xc0 + index)
  NAMED[name.toLowerCase()] = String.fromCodePoint(0xe0 + index)
})

export function decodeEntities(text: string): string {
  return text.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z]{2,8});/g, (whole, body: string) => {
    if (body[0] !== '#') return NAMED[body] ?? NAMED[body.toLowerCase()] ?? whole
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    return code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : ''
  })
}

const attr = (attrs: string, name: string) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs)?.slice(1).find((value) => value !== undefined)

/** Index of the `>` ending a tag that starts at `from`, honouring quoted attribute values; -1 when unterminated. */
function tagEnd(html: string, from: number): number {
  let quote = ''
  let afterEquals = false
  for (let index = from; index < html.length; index++) {
    const char = html[index]
    if (quote) { if (char === quote) quote = ''; continue }
    if (char === '>') return index
    if ((char === '"' || char === "'") && afterEquals) { quote = char; continue }
    if (char === '=') afterEquals = true
    else if (!' \t\n\r\f'.includes(char)) afterEquals = false
  }
  return -1
}

/**
 * Hand-written single pass instead of one big RegExp: every scan either consumes input or ends the loop, so a
 * hostile 2 MiB page costs linear time (a regex tokenizer went quadratic on unterminated tags and quotes).
 */
function buildTree(html: string): Element {
  const root: Element = { tag: '#root', attrs: '', children: [], parent: null, depth: 0 }
  let current = root
  let index = 0
  while (index < html.length) {
    const open = html.indexOf('<', index)
    if (open < 0) { current.children.push(html.slice(index)); break }
    if (open > index) current.children.push(html.slice(index, open))
    index = open
    if (html.startsWith('<!--', index)) {
      const end = html.indexOf('-->', index + 4)
      index = end < 0 ? html.length : end + 3
      continue
    }
    if (html[index + 1] === '!' || html[index + 1] === '?') {
      const end = html.indexOf('>', index)
      index = end < 0 ? html.length : end + 1
      continue
    }
    const closing = html[index + 1] === '/'
    const nameStart = index + (closing ? 2 : 1)
    const name = /^[a-zA-Z][\w:-]{0,63}/.exec(html.slice(nameStart, nameStart + 64))?.[0]
    if (!name) { current.children.push('<'); index++; continue }
    const end = tagEnd(html, nameStart + name.length)
    // An unterminated tag ends the document: nothing after it can be trusted as text anyway.
    if (end < 0) break
    const tag = name.toLowerCase()
    const attrs = html.slice(nameStart + name.length, end)
    index = end + 1
    if (closing) {
      let node: Element | null = current
      while (node && node.tag !== tag) node = node.parent
      if (node?.parent) current = node.parent
      continue
    }
    if (RAW.has(tag)) {
      const close = new RegExp(`</${tag}\\b`, 'gi')
      close.lastIndex = index
      const found = close.exec(html)
      const after = found ? html.indexOf('>', found.index) : -1
      index = after < 0 ? html.length : after + 1
      continue
    }
    if (CLOSES_P.has(tag) && current.tag === 'p') current = current.parent ?? root
    if (tag === 'li' && current.tag === 'li') current = current.parent ?? root
    const element: Element = { tag, attrs, children: [], parent: current, depth: current.depth + 1 }
    current.children.push(element)
    if (!VOID.has(tag) && !attrs.endsWith('/') && element.depth < MAX_DEPTH) current = element
  }
  return root
}

const chromeCache = new WeakMap<Element, boolean>()

function isChrome(element: Element): boolean {
  let known = chromeCache.get(element)
  if (known === undefined) { known = detectChrome(element); chromeCache.set(element, known) }
  return known
}

function detectChrome(element: Element) {
  if (DROP.has(element.tag)) return true
  if (/(?:^|\s)hidden(?:\s|=|$)/i.test(element.attrs) || attr(element.attrs, 'aria-hidden') === 'true') return true
  if (/display\s*:\s*none/i.test(attr(element.attrs, 'style') ?? '')) return true
  return NOISE.test(`${attr(element.attrs, 'class') ?? ''} ${attr(element.attrs, 'id') ?? ''} ${attr(element.attrs, 'role') === 'navigation' ? 'menu' : ''}`)
}

const clean = (text: string) => decodeEntities(text).replace(/\s+/g, ' ').trim()

function textOf(node: Node): string {
  if (typeof node === 'string') return node
  if (node.tag === 'br') return ' '
  if (isChrome(node)) return ''
  return node.children.map(textOf).join(node.tag === 'tr' ? ' ; ' : '')
}

function elements(root: Element): Element[] {
  const out: Element[] = []
  const visit = (element: Element) => {
    for (const child of element.children) {
      if (typeof child === 'string' || isChrome(child)) continue
      out.push(child)
      visit(child)
    }
  }
  visit(root)
  return out
}

/** Paragraph-weighted scoring: each `<p>` gives its length to the parent and half to the grandparent. */
function pickContainer(root: Element): Element {
  const all = elements(root)
  const paragraphText = new Map<Element, number>()
  const scores = new Map<Element, number>()
  for (const element of all) {
    if (element.tag !== 'p' && element.tag !== 'pre') continue
    const length = clean(textOf(element)).length
    if (length < MIN_PARAGRAPH_CHARS) continue
    for (let node = element.parent, depth = 0; node; node = node.parent, depth++) {
      paragraphText.set(node, (paragraphText.get(node) ?? 0) + length)
      if (depth < 2) scores.set(node, (scores.get(node) ?? 0) + (depth === 0 ? length : length / 2))
    }
  }
  const articles = all.filter((element) => element.tag === 'article' && (paragraphText.get(element) ?? 0) >= MIN_ARTICLE_CHARS)
  if (articles.length) return articles.reduce((a, b) => ((paragraphText.get(b) ?? 0) > (paragraphText.get(a) ?? 0) ? b : a))
  let best: Element | null = null
  for (const [element, score] of scores) if (!best || score > (scores.get(best) ?? 0)) best = element
  return best ?? all.find((element) => element.tag === 'main') ?? all.find((element) => element.tag === 'body') ?? root
}

function segmentsOf(container: Element): { segments: ArticleSegment[]; truncated: boolean } {
  const segments: ArticleSegment[] = []
  let total = 0
  let truncated = false
  let inline = ''
  const push = (raw: string, kind: SegmentKind) => {
    const text = clean(raw)
    if (!text || truncated) return
    if (segments.length >= MAX_SEGMENTS || total + text.length > MAX_ARTICLE_CHARS) { truncated = true; return }
    total += text.length
    segments.push({ id: `s${segments.length + 1}`, text, kind })
  }
  const flush = () => { push(inline, 'paragraph'); inline = '' }
  const visit = (element: Element) => {
    for (const child of element.children) {
      if (typeof child === 'string') { inline += child; continue }
      if (isChrome(child)) continue
      if (INLINE.has(child.tag)) { inline += textOf(child); continue }
      flush()
      const kind = BLOCK_KIND[child.tag]
      if (kind) push(textOf(child), kind)
      else visit(child)
    }
  }
  visit(container)
  flush()
  return { segments, truncated }
}

function titleOf(html: string, root: Element): string {
  for (const tag of html.match(/<meta\b[^<>]*>/gi) ?? []) {
    if (/(?:property|name)\s*=\s*["']?og:title\b/i.test(tag)) {
      const value = clean(attr(tag.slice(5, -1), 'content') ?? '')
      if (value) return value.slice(0, 300)
    }
  }
  const title = /<title\b[^>]*>([^<]*)/i.exec(html)?.[1]
  if (title && clean(title)) return clean(title).slice(0, 300)
  const heading = elements(root).find((element) => element.tag === 'h1')
  return heading ? clean(textOf(heading)).slice(0, 300) : ''
}

/** Returns null when the page has no readable article (NO_ARTICLE). */
export function extractArticle(html: string): Article | null {
  const root = buildTree(html)
  const { segments, truncated } = segmentsOf(pickContainer(root))
  const length = segments.reduce((sum, segment) => sum + segment.text.length, 0)
  if (length < MIN_ARTICLE_CHARS) return null
  return { title: titleOf(html, root), segments, truncated }
}

/** Signals a publisher uses to mark the article as paid (schema.org `isAccessibleForFree`, content tier meta). */
export function looksPaywalled(html: string): boolean {
  if (/"isAccessibleForFree"\s*:\s*"?false"?/i.test(html)) return true
  return (html.match(/<meta\b[^<>]*>/gi) ?? []).some((tag) => {
    const attrs = tag.slice(5, -1)
    return (attr(attrs, 'property') ?? attr(attrs, 'name'))?.toLowerCase() === 'article:content_tier'
      && /^(?:locked|metered)$/i.test(attr(attrs, 'content') ?? '')
  })
}

/** Charset from the header, then a `<meta charset>` in the first 2 KiB, then UTF-8; unknown labels fall back to UTF-8. */
export function decodeHtml(body: Buffer, headerCharset: string | null): string {
  if (body.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) return new TextDecoder('utf-8').decode(body.subarray(3))
  const sniffed = /<meta\b[^>]*charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(body.subarray(0, 2048).toString('latin1'))?.[1]
  for (const label of [headerCharset, sniffed, 'utf-8']) {
    if (!label) continue
    try { return new TextDecoder(label).decode(body) } catch { /* unknown label, try the next one */ }
  }
  return body.toString('utf8')
}
