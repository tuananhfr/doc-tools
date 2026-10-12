import { TOOL_ERROR, type ToolErrorCode } from '@/features/tools/hub/utils/tool-error'
import { READ_PART_CHARS, READ_TEXT_MAX_CHARS } from '../config/read-listen'
import type { ReadErrorCode, ReadRange, ReadSource } from '../types/read-listen.types'

export type ReadFileKind = 'pdf' | 'docx' | 'txt' | 'legacy-doc'
export type TextEncodingName = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1258'
export type DecodedText = { ok: true; text: string; encoding: TextEncodingName } | { ok: false; code: 'UNSUPPORTED' }
export type FileSourceResult = { ok: true; source: ReadSource } | { ok: false; code: 'NO_ARTICLE' | 'TOO_LARGE' }

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]
const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE = [0xd0, 0xcf, 0x11, 0xe0]
const TEXT_NAME = /\.(txt|text|md)$/i
const READABLE = /[\p{L}\p{N}]/u
const TOO_LARGE_TOOL_CODES: readonly ToolErrorCode[] = [TOOL_ERROR.fileTooLarge, TOOL_ERROR.pageLimit, TOOL_ERROR.pixelLimit, TOOL_ERROR.memory]

const startsWith = (bytes: Uint8Array, signature: readonly number[]) => signature.every((byte, index) => bytes[index] === byte)

/** Loại tệp theo byte đầu trước, tên sau: tệp đổi đuôi vẫn nhận đúng; zip không phải `.docx` thì không đoán. */
export function readFileKind(name: string, mime: string, head: Uint8Array): ReadFileKind | null {
  if (startsWith(head, PDF) || /\.pdf$/i.test(name)) return 'pdf'
  if (startsWith(head, ZIP)) return /\.docx$/i.test(name) ? 'docx' : null
  // Word 97–2003 (.doc) là định dạng OLE nhị phân — không đọc được chữ trên trình duyệt.
  if (startsWith(head, OLE)) return 'legacy-doc'
  if (TEXT_NAME.test(name) || mime === 'text/plain') return 'txt'
  return null
}

function bomEncoding(bytes: Uint8Array): TextEncodingName | null {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) return 'utf-8'
  if (startsWith(bytes, [0xff, 0xfe])) return 'utf-16le'
  if (startsWith(bytes, [0xfe, 0xff])) return 'utf-16be'
  return null
}

/**
 * TXT → chữ: BOM → UTF-8 chặt → windows-1258 (Notepad cũ trên Windows tiếng Việt lưu kiểu này). windows-1258 để
 * dấu thanh thành ký tự tổ hợp riêng nên phải NFC, không thì bôi chữ lệch và giọng đọc vấp. Có NUL = tệp nhị phân.
 */
export function decodeTextFile(bytes: Uint8Array): DecodedText {
  const bom = bomEncoding(bytes)
  let encoding: TextEncodingName = bom ?? 'utf-8'
  let text: string
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch {
    if (bom) return { ok: false, code: 'UNSUPPORTED' }
    encoding = 'windows-1258'
    text = new TextDecoder(encoding).decode(bytes)
  }
  if (text.includes('\u0000')) return { ok: false, code: 'UNSUPPORTED' }
  return { ok: true, text: text.normalize('NFC').replace(/\r\n?/g, '\n'), encoding }
}

/**
 * Chia văn bản dài thành các phần ≤ `max`, liền nhau, phủ hết. Cắt ở hết đoạn, rồi hết câu, rồi khoảng trắng —
 * chỉ khi điểm cắt nằm ở nửa sau, không thì phần quá ngắn; không có chỗ nào thì cắt cứng.
 */
export function splitReadParts(text: string, max = READ_PART_CHARS): ReadRange[] {
  const parts: ReadRange[] = []
  let start = 0
  while (text.length - start > max) {
    const window = text.slice(start, start + max)
    const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
    const cut = [window.lastIndexOf('\n') + 1, sentence + 2, window.lastIndexOf(' ') + 1].find((at) => at > max / 2) ?? max
    parts.push({ start, end: start + cut })
    start += cut
  }
  parts.push({ start, end: text.length })
  return parts
}

/** Chữ các trang PDF theo đúng thứ tự trang; trang scan lấy chữ OCR ĐÃ KIỂM TRA, trang trống bị bỏ. */
export function mergePdfPages(pageTexts: readonly (string | null)[], recognized: ReadonlyMap<number, string>): string {
  return pageTexts.map((text, index) => (text ?? recognized.get(index) ?? '').trim()).filter(Boolean).join('\n\n')
}

/** Chữ dán: quá trần cứng thì cắt và gắn TOO_LARGE để trang nói ra, không cắt im lặng. */
export function pastedSource(text: string, max = READ_TEXT_MAX_CHARS): ReadSource | null {
  if (!text.trim()) return null
  return { kind: 'text', title: '', text: text.slice(0, max), warnings: text.length > max ? ['TOO_LARGE'] : [] }
}

export function toFileSource(title: string, text: string, max = READ_TEXT_MAX_CHARS): FileSourceResult {
  const trimmed = text.trim()
  if (!READABLE.test(trimmed)) return { ok: false, code: 'NO_ARTICLE' }
  if (trimmed.length > max) return { ok: false, code: 'TOO_LARGE' }
  return { ok: true, source: { kind: 'file', title, text: trimmed, warnings: [] } }
}

/** Mã lỗi của bước nạp PDF dùng chung (`ingestFile`) → mã của Đọc & Nghe. */
export function readErrorFromTool(code: ToolErrorCode): ReadErrorCode {
  return TOO_LARGE_TOOL_CODES.includes(code) ? 'TOO_LARGE' : 'UNSUPPORTED'
}
