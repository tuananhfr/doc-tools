import { PDFDocument } from 'pdf-lib'
import { maxImagePixels, megabytes, TOOL_ERROR, TOOL_LIMITS, type ToolErrorCode } from '@/features/tools/hub'
import { attachJpegExif, canvasToBlob, exifForRedraw, readImageSize, readJpegExif } from '@/features/tools/shared'
import { newId } from '@/utils/id'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { FormSummary } from '../types/form.types'
import { detectKind, readJpegOrientation } from '../utils/file-guard'
import { formSummary } from './pdf-form'
import { lockKind, unlockPdf, type LockKind } from './pdf-unlock'

export type IngestResult =
  | { ok: true; source: SourceFile; pages: PageRef[] }
  | { ok: false; code: ToolErrorCode; reason: string }
  /** Tệp cần mật khẩu: không phải bị từ chối — trang hỏi mật khẩu rồi nạp lại bản đã giải. */
  | { ok: false; code: ToolErrorCode; reason: string; locked: LockKind; bytes: Uint8Array<ArrayBuffer> }

function pageRefs(source: SourceFile): PageRef[] {
  return Array.from({ length: source.pageCount }, (_, pageIndex) => ({
    id: newId(),
    sourceId: source.id,
    pageIndex,
    rotation: 0,
  }))
}

type Inspected = { pageCount: number; form?: FormSummary } | 'encrypted' | string

async function inspectPdf(bytes: Uint8Array): Promise<Inspected> {
  let doc: PDFDocument
  try {
    // Mở với `ignoreEncryption` rồi hỏi `isEncrypted`: lỗi pdf-lib ném ra là
    // `Error` trần (bản build ES5 làm hỏng `instanceof EncryptedPDFError`), bắt
    // theo kiểu lỗi là báo nhầm tệp có mật khẩu thành "tệp hỏng".
    doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })
  } catch {
    return 'Tệp PDF hỏng hoặc không đọc được.'
  }
  // pdf-lib không giải mã được: chép luồng đã mã hoá sang tệp mới thì PDF ra
  // toàn trang trắng — phải qua qpdf giải trước.
  if (doc.isEncrypted) return 'encrypted'
  return { pageCount: doc.getPageCount(), form: formSummary(doc) }
}

const LOCKED_REASON: Record<LockKind, string> = {
  open: 'Tệp có mật khẩu — dùng "Thêm tệp" để nhập mật khẩu mở khoá.',
  owner: 'Tệp bị khoá quyền sửa — dùng "Thêm tệp" để nhập mật khẩu chủ.',
}

/** Tệp mã hoá mà không đặt mật khẩu nào (nhiều máy scan, Word xuất ra thế) thì giải luôn, khỏi hỏi. */
async function decryptWithoutPassword(bytes: Uint8Array<ArrayBuffer>): Promise<IngestResult | Uint8Array<ArrayBuffer>> {
  try {
    const locked = await lockKind(bytes)
    if (locked) return { ok: false, code: TOOL_ERROR.permission, reason: LOCKED_REASON[locked], locked, bytes }
    const result = await unlockPdf(bytes, '')
    return result.ok ? result.bytes : { ok: false, code: TOOL_ERROR.permission, reason: 'Tệp PDF mã hoá không giải được.' }
  } catch {
    return { ok: false, code: TOOL_ERROR.unknown, reason: 'Không tải được bộ mở khoá PDF. Kiểm tra kết nối mạng rồi thử lại.' }
  }
}

/**
 * Ảnh JPEG có cờ xoay EXIF → vẽ lại một lần cho điểm ảnh đứng đúng chiều.
 * `createImageBitmap` mặc định áp EXIF (`imageOrientation: 'from-image'`).
 *
 * Vẽ lại là mất EXIF, mà gần như mọi ảnh chụp dọc bằng điện thoại đều đi qua
 * đây: chép khối EXIF của ảnh gốc sang (cờ hướng đã về 1) để ngày chụp và toạ
 * độ còn nằm trong PDF, như với ảnh không cần xoay.
 */
async function normalizeJpeg(bitmap: ImageBitmap, original: Uint8Array): Promise<Uint8Array<ArrayBuffer> | null> {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0)

  const blob = await canvasToBlob(canvas, 'image/jpeg').catch(() => null)
  if (!blob) return null
  const exif = readJpegExif(original)
  const adjusted = exif ? exifForRedraw(exif, bitmap) : null
  const tagged = adjusted ? await attachJpegExif(blob, adjusted) : null
  return new Uint8Array(await (tagged ?? blob).arrayBuffer())
}

/** Đọc một tệp người dùng thả vào thành `SourceFile` + các trang của nó. */
export async function ingestFile(file: File): Promise<IngestResult> {
  if (file.size === 0) return { ok: false, code: TOOL_ERROR.corruptFile, reason: 'Tệp rỗng.' }
  if (file.size > TOOL_LIMITS.fileBytes) return { ok: false, code: TOOL_ERROR.fileTooLarge, reason: `Tệp vượt ${megabytes(TOOL_LIMITS.fileBytes)}.` }

  let bytes: Uint8Array<ArrayBuffer> = new Uint8Array(await file.arrayBuffer())
  const detected = detectKind(bytes.subarray(0, 1024))
  if (!detected) return { ok: false, code: TOOL_ERROR.unsupportedFormat, reason: 'Chỉ nhận PDF, JPG hoặc PNG.' }

  if (detected.kind === 'pdf') {
    let inspected = await inspectPdf(bytes)
    if (inspected === 'encrypted') {
      const decrypted = await decryptWithoutPassword(bytes)
      if (!(decrypted instanceof Uint8Array)) return decrypted
      bytes = decrypted
      inspected = await inspectPdf(bytes)
      if (inspected === 'encrypted') return { ok: false, code: TOOL_ERROR.permission, reason: 'Tệp PDF mã hoá không giải được.' }
    }
    if (typeof inspected === 'string') return { ok: false, code: TOOL_ERROR.corruptFile, reason: inspected }
    if (inspected.pageCount === 0) return { ok: false, code: TOOL_ERROR.corruptFile, reason: 'Tệp PDF không có trang nào.' }

    const source: SourceFile = {
      id: newId(),
      name: file.name,
      kind: 'pdf',
      mime: 'application/pdf',
      bytes,
      size: bytes.byteLength,
      pageCount: inspected.pageCount,
      form: inspected.form,
    }
    return { ok: true, source, pages: pageRefs(source) }
  }

  const size = readImageSize(bytes, detected.mime === 'image/png' ? 'png' : 'jpeg')
  if (size && size.width * size.height > maxImagePixels()) {
    return { ok: false, code: TOOL_ERROR.pixelLimit, reason: `Ảnh quá lớn (vượt ${maxImagePixels() / 1_000_000} triệu điểm ảnh).` }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: detected.mime }))
  } catch {
    return { ok: false, code: TOOL_ERROR.corruptFile, reason: 'Ảnh hỏng hoặc không đọc được.' }
  }

  try {
    if (bitmap.width * bitmap.height > maxImagePixels()) {
      return { ok: false, code: TOOL_ERROR.pixelLimit, reason: `Ảnh quá lớn (vượt ${maxImagePixels() / 1_000_000} triệu điểm ảnh).` }
    }
    if (detected.mime === 'image/jpeg' && readJpegOrientation(bytes) !== 1) {
      const upright = await normalizeJpeg(bitmap, bytes)
      if (!upright) return { ok: false, code: TOOL_ERROR.memory, reason: 'Không xoay được ảnh theo EXIF.' }
      bytes = upright
    }
  } finally {
    bitmap.close()
  }

  const source: SourceFile = {
    id: newId(),
    name: file.name,
    kind: 'image',
    mime: detected.mime,
    bytes,
    size: bytes.byteLength,
    pageCount: 1,
  }
  return { ok: true, source, pages: pageRefs(source) }
}
