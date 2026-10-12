import { strFromU8, unzipSync } from 'fflate'
import { READ_DOCX_XML_MAX_BYTES } from '../config/read-listen'

export type DocxText = { ok: true; text: string } | { ok: false; code: 'UNSUPPORTED' | 'TOO_LARGE' }

const DOCUMENT = 'word/document.xml'
// Thẻ mở/đóng/tự đóng có tiền tố (`w:p`, `mc:Fallback`) hoặc một khúc chữ giữa hai thẻ.
const TOKEN = /<(\/?)([A-Za-z][\w.-]*(?::[\w.-]+)?)([^>]*?)(\/?)>|([^<]+)/g
const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|(lt|gt|amp|quot|apos));/gi
const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

const decodeEntities = (text: string) => text.replace(ENTITY, (_, decimal?: string, hex?: string, name?: string) =>
  decimal ? String.fromCodePoint(Number(decimal)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : NAMED[(name ?? '').toLowerCase()])

/**
 * `word/document.xml` → chữ theo đúng thứ tự xuất hiện (đoạn và ô bảng xen nhau như trong tệp). Không dùng DOMParser:
 * test chạy node không có nó, và tách thẻ tay thì không có thực thể XML ngoài. Bỏ nhánh `mc:Fallback` — hộp chữ
 * Word lưu hai bản (Choice + Fallback), đọc cả hai là nghe mọi câu trong hộp hai lần.
 */
export function wordXmlToText(xml: string): string {
  let out = ''
  let inText = false
  let fallbackDepth = 0
  for (const [, closing, name, , selfClosing, chars] of xml.matchAll(TOKEN)) {
    if (chars !== undefined) {
      if (inText && fallbackDepth === 0) out += decodeEntities(chars)
      continue
    }
    if (name === 'mc:Fallback') {
      if (!selfClosing) fallbackDepth += closing ? -1 : 1
      continue
    }
    if (fallbackDepth > 0) continue
    if (name === 'w:t') {
      inText = !closing && !selfClosing
      continue
    }
    if (name === 'w:p') {
      if (closing || selfClosing) out += '\n'
      continue
    }
    if (closing) continue
    if (name === 'w:tab') out += '\t'
    else if (name === 'w:br' || name === 'w:cr') out += '\n'
  }
  return out.normalize('NFC').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** DOCX → chữ. Chỉ giải nén đúng `word/document.xml`, và kiểm cỡ KHAI trong zip trước: tệp "bom" vài KB nở ra hàng GB. */
export function docxToText(bytes: Uint8Array, maxXmlBytes = READ_DOCX_XML_MAX_BYTES): DocxText {
  let oversized = false
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes, {
      filter: (file) => {
        if (file.name !== DOCUMENT) return false
        oversized = file.originalSize > maxXmlBytes
        return !oversized
      },
    })
  } catch {
    return { ok: false, code: 'UNSUPPORTED' }
  }
  if (oversized) return { ok: false, code: 'TOO_LARGE' }
  const xml = files[DOCUMENT]
  return xml ? { ok: true, text: wordXmlToText(strFromU8(xml)) } : { ok: false, code: 'UNSUPPORTED' }
}
