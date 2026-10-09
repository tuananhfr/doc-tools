/**
 * The per-site intro page has fixed blocks: staff change text and pictures only, never layout. The
 * frontend keeps a mirror of these types (features/site-landing); a field added here goes there too.
 */
export const LANDING_VERSION = 1
export const LANDING_ITEMS = 3

export type LandingMode = 'light' | 'dark'

export interface LandingToolItem { slug: string; title: string; body: string }
export interface LandingCaseItem { title: string; body: string; image: string | null; target: string; linkLabel: string }
export interface LandingTextItem { title: string; body: string }

export interface LandingDoc {
  v: typeof LANDING_VERSION
  theme: { accent: string; mode: LandingMode; logo: string | null }
  /** Address of the page on the host site; empty until that site proxies it. */
  canonicalUrl: string
  meta: { title: string; description: string }
  hero: { title: string; highlight: string; body: string; cta: string; image: string | null }
  tools: { title: string; body: string; image: string | null; items: LandingToolItem[] }
  cases: { title: string; body: string; items: LandingCaseItem[] }
  steps: { title: string; body: string; note: string; items: LandingTextItem[] }
  privacy: { title: string; body: string; image: string | null; items: LandingTextItem[] }
  closing: { title: string; body: string; image: string | null }
  footer: { tagline: string }
}

/** DocTools pages a use-case card may open besides a tool. */
export const LANDING_PAGE_TARGETS = ['cong-cu', 'tai-lieu-pdf', 'gia-dinh', 'xay-dung', 'huong-dan'] as const

export const LANDING_KEY = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
export const ASSET_ID = /^[0-9a-f]{64}$/

const SHORT = 60
const TITLE = 120
const BODY = 400

export class LandingInputError extends Error {
  constructor(readonly field: string, message: string) { super(message) }
}

export interface LandingChecks {
  readyTool(slug: string): boolean
}

type Raw = Record<string, unknown>

function record(value: unknown, field: string): Raw {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LandingInputError(field, 'Thiếu nội dung của khối này.')
  return value as Raw
}

/** One line of plain text: the page renders it as text, so markup stays literal and newlines collapse. */
export function cleanText(value: unknown, field: string, max: number, required: boolean) {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') throw new LandingInputError(field, 'Nội dung phải là chữ.')
  const text = value.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim()
  if (required && !text) throw new LandingInputError(field, 'Không được để trống.')
  if ([...text].length > max) throw new LandingInputError(field, `Tối đa ${max} ký tự.`)
  return text
}

function image(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !ASSET_ID.test(value)) throw new LandingInputError(field, 'Ảnh không hợp lệ.')
  return value
}

function items<T>(value: unknown, field: string, parse: (item: Raw, field: string) => T) {
  if (!Array.isArray(value) || value.length !== LANDING_ITEMS) throw new LandingInputError(field, `Cần đúng ${LANDING_ITEMS} mục.`)
  return value.map((item, index) => parse(record(item, `${field}.${index}`), `${field}.${index}`))
}

function canonical(value: unknown) {
  const text = cleanText(value, 'canonicalUrl', 300, false)
  if (!text) return ''
  let url: URL
  try { url = new URL(text) } catch { throw new LandingInputError('canonicalUrl', 'Địa chỉ không hợp lệ.') }
  // Plain http only for a local proxy while testing; a public host site must be https.
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.username || url.password || !(url.protocol === 'https:' || (url.protocol === 'http:' && local))) throw new LandingInputError('canonicalUrl', 'Địa chỉ phải bắt đầu bằng https://.')
  return url.href
}

/** Throws LandingInputError naming the first bad field, so the admin form can point at it. */
export function parseLandingDoc(input: unknown, checks: LandingChecks): LandingDoc {
  const doc = record(input, 'doc')
  const theme = record(doc.theme, 'theme')
  const accent = typeof theme.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(theme.accent) ? theme.accent.toLowerCase() : null
  if (!accent) throw new LandingInputError('theme.accent', 'Màu nhấn phải có dạng #RRGGBB.')
  if (theme.mode !== 'light' && theme.mode !== 'dark') throw new LandingInputError('theme.mode', 'Chọn giao diện sáng hoặc tối.')

  const meta = record(doc.meta, 'meta')
  const hero = record(doc.hero, 'hero')
  const tools = record(doc.tools, 'tools')
  const cases = record(doc.cases, 'cases')
  const steps = record(doc.steps, 'steps')
  const privacy = record(doc.privacy, 'privacy')
  const closing = record(doc.closing, 'closing')
  const footer = record(doc.footer, 'footer')
  const text = (raw: Raw, block: string, key: string, max: number, required = true) => cleanText(raw[key], `${block}.${key}`, max, required)
  const plainItems = (raw: Raw, block: string) => items(raw.items, `${block}.items`, (item, field) => ({
    title: cleanText(item.title, `${field}.title`, TITLE, true),
    body: cleanText(item.body, `${field}.body`, BODY, false),
  }))

  return {
    v: LANDING_VERSION,
    theme: { accent, mode: theme.mode, logo: image(theme.logo, 'theme.logo') },
    canonicalUrl: canonical(doc.canonicalUrl),
    meta: { title: text(meta, 'meta', 'title', 70), description: text(meta, 'meta', 'description', 200, false) },
    hero: {
      title: text(hero, 'hero', 'title', TITLE), highlight: text(hero, 'hero', 'highlight', TITLE, false),
      body: text(hero, 'hero', 'body', BODY, false), cta: text(hero, 'hero', 'cta', SHORT), image: image(hero.image, 'hero.image'),
    },
    tools: {
      title: text(tools, 'tools', 'title', TITLE), body: text(tools, 'tools', 'body', BODY, false), image: image(tools.image, 'tools.image'),
      items: items(tools.items, 'tools.items', (item, field) => {
        const slug = typeof item.slug === 'string' ? item.slug : ''
        if (!checks.readyTool(slug)) throw new LandingInputError(`${field}.slug`, 'Công cụ không có hoặc chưa mở.')
        // Empty title / body fall back to the tool's own catalog name and description on the page.
        return { slug, title: cleanText(item.title, `${field}.title`, TITLE, false), body: cleanText(item.body, `${field}.body`, BODY, false) }
      }),
    },
    cases: {
      title: text(cases, 'cases', 'title', TITLE), body: text(cases, 'cases', 'body', BODY, false),
      items: items(cases.items, 'cases.items', (item, field) => {
        const target = typeof item.target === 'string' ? item.target : ''
        if (!(LANDING_PAGE_TARGETS as readonly string[]).includes(target) && !checks.readyTool(target)) throw new LandingInputError(`${field}.target`, 'Trang đích không có.')
        return {
          title: cleanText(item.title, `${field}.title`, TITLE, true), body: cleanText(item.body, `${field}.body`, BODY, false),
          image: image(item.image, `${field}.image`), target, linkLabel: cleanText(item.linkLabel, `${field}.linkLabel`, SHORT, true),
        }
      }),
    },
    steps: {
      title: text(steps, 'steps', 'title', TITLE), body: text(steps, 'steps', 'body', BODY, false), note: text(steps, 'steps', 'note', BODY, false),
      items: plainItems(steps, 'steps'),
    },
    privacy: {
      title: text(privacy, 'privacy', 'title', TITLE), body: text(privacy, 'privacy', 'body', BODY, false), image: image(privacy.image, 'privacy.image'),
      items: plainItems(privacy, 'privacy'),
    },
    closing: { title: text(closing, 'closing', 'title', TITLE), body: text(closing, 'closing', 'body', BODY, false), image: image(closing.image, 'closing.image') },
    footer: { tagline: text(footer, 'footer', 'tagline', TITLE, false) },
  }
}

export function assetIdsOf(doc: LandingDoc) {
  const ids = [doc.theme.logo, doc.hero.image, doc.tools.image, doc.privacy.image, doc.closing.image, ...doc.cases.items.map((item) => item.image)]
  return [...new Set(ids.filter((id): id is string => id !== null))]
}
