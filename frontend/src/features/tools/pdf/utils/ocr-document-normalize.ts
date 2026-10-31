import type { OcrDocumentBlock, OcrDocumentText, OcrEditableDocument } from '../types/ocr-document.types'

const BODY_SIZE = 11
const paragraphStart = (text: string) => /^[^\p{L}\p{N}]{0,5}(?:[-•]|\d+[.)]|[A-ZĐ]\.)\s/u.test(text)
  || /^(?:Câu|Điều|Mục|Chương|Question|Article|Section|Chapter)\s+\d+/iu.test(text)
const median = (values: number[], fallback: number) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? fallback

/** Nearby body paragraphs distinguish a real heading from the camera's size gradient. */
function localBodySize(block: OcrDocumentText, texts: OcrDocumentText[]) {
  const nearby = texts.filter(other => other !== block && other.text.length >= 40).sort((a, b) => a.y - b.y)
  const before = nearby.findLast(other => other.y <= block.y), after = nearby.find(other => other.y > block.y)
  if (before && after) return before.fontSize + (after.fontSize - before.fontSize) * (block.y - before.y) / (after.y - before.y)
  return before?.fontSize ?? after?.fontSize ?? median(texts.map(other => other.fontSize), BODY_SIZE)
}

function textRole(block: OcrDocumentText, texts: OcrDocumentText[]) {
  const text = block.text.trim(), lines = block.referenceLines?.length ?? 1
  // A numbered section can be emphasized without changing the body text size.
  if (text.length <= 140 && /^(?:(?:Điều|Mục|Chương|Article|Section|Chapter)\s+\d+|\d+[.)]\s+[^\n]{1,70}:\s*[\p{P}\p{S}]*$)/iu.test(text)) return 'section'
  const letters = text.match(/\p{L}/gu) ?? []
  const cased = letters.filter(letter => letter.toLocaleUpperCase() !== letter.toLocaleLowerCase())
  const capitals = cased.length >= 5 && cased.filter(letter => letter === letter.toLocaleUpperCase()).length / cased.length >= .9
  if (letters.length >= 5 && !paragraphStart(text) && text.length <= 140 && lines <= 2
    && (capitals || block.bold && block.fontSize > localBodySize(block, texts) * 1.22)) return 'title'
  return 'body'
}

/** Reconstruct a clean document once. Photograph coordinates are only used for reading order,
 * paragraph boundaries and column/table structure, never the final body font size or margins.
 * Do not run this on an edited document: the user's formatting must remain authoritative.
 */
export function normalizeOcrDocument(document: OcrEditableDocument): OcrEditableDocument {
  const next = structuredClone(document)
  for (const page of next.pages) {
    const form = page.blocks.some(block => block.kind === 'table')
    const denseForm = page.blocks.some(block => block.kind === 'table' && block.columns.length >= 8)
    const bodySize = denseForm ? 9.5 : BODY_SIZE, lineHeight = denseForm ? 1.2 : 1.3
    const contentLeft = Math.min(...page.blocks.map(block => block.x)), contentRight = Math.max(...page.blocks.map(block => block.x + block.width))
    const lastTableBottom = Math.max(0, ...page.blocks.filter(block => block.kind === 'table').map(block => block.y + block.height))
    const texts = page.blocks.filter((block): block is OcrDocumentText => block.kind === 'text')
    const roles = new Map(texts.map(block => [block.id, textRole(block, texts)]))
    const ordered = [...page.blocks].sort((a, b) => a.y - b.y || a.x - b.x), joined: OcrDocumentBlock[] = []
    for (const block of ordered) {
      const previous = joined.at(-1)
      if (!form && block.kind === 'text' && previous?.kind === 'text' && roles.get(block.id) === 'body' && roles.get(previous.id) === 'body'
        && !paragraphStart(block.text) && block.y > previous.y + 1) {
        const gap = block.y - previous.y - previous.height, scale = Math.max(block.fontSize, previous.fontSize)
        const overlap = Math.min(block.x + block.width, previous.x + previous.width) - Math.max(block.x, previous.x)
        if (gap >= -scale * .3 && gap < scale * .8 && overlap > Math.min(block.width, previous.width) * .6 && Math.abs(block.x - previous.x) < scale * 3) {
          const right = Math.max(previous.x + previous.width, block.x + block.width)
          previous.x = Math.min(previous.x, block.x); previous.width = right - previous.x
          previous.height = block.y + block.height - previous.y
          previous.text += ` ${block.text}`
          continue
        }
      }
      joined.push(block)
    }
    const margin = Math.min(42, page.width * .07, page.height * .07), width = page.width - margin * 2
    page.margin = margin
    let y = margin
    for (let index = 0; index < joined.length;) {
      const first = joined[index], band = [first]
      // Keep clearly separate text columns on the same row; drifting paragraph edges are not columns.
      while (first.kind === 'text' && index + band.length < joined.length) {
        const candidate = joined[index + band.length]
        if (candidate.kind !== 'text' || Math.abs(candidate.y - first.y) > Math.min(first.fontSize, candidate.fontSize) * .4
          || band.some(block => Math.min(block.x + block.width, candidate.x + candidate.width) > Math.max(block.x, candidate.x) - 8)) break
        band.push(candidate)
      }
      const left = Math.min(...band.map(block => block.x)), right = Math.max(...band.map(block => block.x + block.width))
      const bandXs = band.map(block => block.x)
      let height = 0, gap = denseForm ? 2 : 4
      for (const block of band) {
        const sourceX = block.x, sourceY = block.y, sourceWidth = block.width
        const bandLeft = form ? contentLeft : left, bandWidth = form ? contentRight - contentLeft : right - left
        const x = band.length === 1 ? margin : margin + (block.x - bandLeft) / bandWidth * width
        let blockWidth = band.length === 1 ? width : block.width / bandWidth * width
        if (form && band.length > 1 && !(sourceY > lastTableBottom && block.kind === 'text' && !block.text.includes(':') && sourceWidth < page.width * .35)) {
          const nextX = Math.min(...bandXs.filter(otherX => otherX > sourceX).map(otherX => margin + (otherX - bandLeft) / bandWidth * width), margin + width)
          blockWidth = Math.max(blockWidth, nextX - x - 5)
        }
        block.x = x; block.y = y; block.width = blockWidth
        if (block.kind === 'text') {
          const role = roles.get(block.id)
          block.fontSize = role === 'title' ? form ? bodySize + 1 : 16 : bodySize
          block.bold = role !== 'body'; block.align = 'left'; block.lineHeight = lineHeight; block.indent = 0
          if (form && band.length > 1) {
            if (sourceY > lastTableBottom && !block.text.includes(':') && sourceWidth < page.width * .35) block.align = 'center'
          }
          else if (form && sourceY > lastTableBottom && sourceWidth < page.width * .45 && sourceX + sourceWidth / 2 < page.width * .45) {
            block.width = width * .48; block.align = 'center'
          } else if (form && sourceY > lastTableBottom && sourceWidth < page.width * .3 && sourceX > page.width * .55) {
            block.x = margin + width * .52; block.width = width * .48; block.align = 'center'
          } else if (form && sourceX > page.width * .55) block.align = 'right'
          else if (form && sourceX > page.width * .3 && sourceWidth < page.width * .65 && block.text.length < 80
            && Math.abs(sourceX + sourceWidth / 2 - page.width / 2) < page.width * .12) block.align = 'center'
          block.height = block.fontSize * block.lineHeight
          delete block.referenceLines
          if (role !== 'body') gap = denseForm ? 4 : 7
        } else {
          const total = block.columns.reduce((sum, value) => sum + value, 0)
          block.columns = block.columns.map(column => column / total * blockWidth)
          block.rows = block.rows.map(() => bodySize * lineHeight + (denseForm ? 6 : 10))
          block.height = block.rows.reduce((sum, value) => sum + value, 0)
          for (const cell of block.cells) { cell.fontSize = bodySize; cell.lineHeight = lineHeight }
          gap = denseForm ? 4 : 7
        }
        height = Math.max(height, block.height)
      }
      y += height + gap
      index += band.length
    }
    page.blocks = joined
  }
  return next
}
