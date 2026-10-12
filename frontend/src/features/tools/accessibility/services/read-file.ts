import type { OcrReviewPage } from '@/features/tools/pdf/hooks/useOcrReview'
import { READ_FILE_MAX_BYTES } from '../config/read-listen'
import type { ReadErrorCode, ReadSource } from '../types/read-listen.types'
import { docxToText } from '../utils/docx-text'
import { decodeTextFile, readFileKind, toFileSource, type TextEncodingName } from '../utils/read-source'
import { readPdfText, reviewedPdfText, type PdfPendingReview, type PdfReadProgress } from './pdf-to-text'

export { releasePdfText as releaseReadFile } from './pdf-to-text'

export type ReadFileOutcome =
  | { kind: 'done'; source: ReadSource; encoding?: TextEncodingName; skippedPages: number }
  | { kind: 'review'; pending: PdfPendingReview }
  | { kind: 'error'; code: ReadErrorCode; reason?: string }

const HEAD_BYTES = 8

function finished(name: string, text: string, skippedPages: number, encoding?: TextEncodingName): ReadFileOutcome {
  const result = toFileSource(name, text)
  return result.ok ? { kind: 'done', source: result.source, encoding, skippedPages } : { kind: 'error', code: result.code }
}

/** Tệp → văn bản để đọc, hoàn toàn trên máy. Không ném lỗi: mọi thất bại thành một mã của Đọc & Nghe. */
export async function readFile(file: File, signal: AbortSignal, onProgress: (progress: PdfReadProgress) => void): Promise<ReadFileOutcome> {
  try {
    const kind = readFileKind(file.name, file.type, new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer()))
    if (kind === 'pdf') {
      const result = await readPdfText(file, signal, onProgress)
      if (!result.ok) return { kind: 'error', code: result.code, reason: result.reason }
      const { pending } = result
      return pending.review.length ? { kind: 'review', pending } : finished(file.name, reviewedPdfText(pending, []), pending.skippedPages)
    }
    if (kind !== 'docx' && kind !== 'txt') return { kind: 'error', code: 'UNSUPPORTED' }
    if (file.size > READ_FILE_MAX_BYTES) return { kind: 'error', code: 'TOO_LARGE' }
    const bytes = new Uint8Array(await file.arrayBuffer())
    signal.throwIfAborted()
    if (kind === 'docx') {
      const docx = docxToText(bytes)
      return docx.ok ? finished(file.name, docx.text, 0) : { kind: 'error', code: docx.code }
    }
    const decoded = decodeTextFile(bytes)
    return decoded.ok ? finished(file.name, decoded.text, 0, decoded.encoding) : { kind: 'error', code: decoded.code }
  } catch (error) {
    // Hết bộ nhớ khi giải nén / dựng trang báo bằng RangeError. Bị huỷ cũng rơi vào đây — nơi gọi đã bỏ kết quả.
    return { kind: 'error', code: error instanceof RangeError ? 'TOO_LARGE' : 'UNSUPPORTED', reason: error instanceof Error ? error.message : undefined }
  }
}

/** Sau khi người dùng kiểm tra xong chữ OCR. Còn từ chưa kiểm (khung kiểm tra lẽ ra đã khoá nút) → OCR_UNCERTAIN, không đọc. */
export function completePdfReview(pending: PdfPendingReview, reviewed: readonly OcrReviewPage[]): ReadFileOutcome {
  try {
    return finished(pending.name, reviewedPdfText(pending, reviewed), pending.skippedPages)
  } catch {
    return { kind: 'error', code: 'OCR_UNCERTAIN' }
  }
}
