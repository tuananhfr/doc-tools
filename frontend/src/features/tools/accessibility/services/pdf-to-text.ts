import { TOOL_LIMITS } from '@/features/tools/hub'
import type { OcrReviewPage } from '@/features/tools/pdf/hooks/useOcrReview'
import { ingestFile } from '@/features/tools/pdf/services/ingest'
import { stopOcr } from '@/features/tools/pdf/services/ocr'
import { reviewedOcrText } from '@/features/tools/pdf/services/ocr-export'
import { recognizePipeline } from '@/features/tools/pdf/services/ocr-pipeline'
import { releaseAll } from '@/features/tools/pdf/services/pdf-render'
import { clearTextLayer, loadPageText } from '@/features/tools/pdf/services/text-layer'
import { reviewedPageText } from '@/features/tools/pdf/utils/ocr-review'
import { plainText } from '@/features/tools/pdf/utils/plain-text'
import { READ_OCR_MAX_PAGES } from '../config/read-listen'
import type { ReadErrorCode } from '../types/read-listen.types'
import { mergePdfPages, readErrorFromTool } from '../utils/read-source'

export interface PdfReadProgress {
  stage: 'text' | 'ocr'
  done: number
  total: number
}

/** PDF đã đọc xong lớp chữ; trang scan (nếu có) chờ người dùng kiểm tra chữ OCR rồi mới ghép vào bài. */
export interface PdfPendingReview {
  name: string
  /** Chữ từng trang theo thứ tự; `null` = trang scan. */
  pageTexts: (string | null)[]
  review: OcrReviewPage[]
  skippedPages: number
}

export type PdfReadResult = { ok: true; pending: PdfPendingReview } | { ok: false; code: ReadErrorCode; reason?: string }

/**
 * Lớp chữ từng trang bằng chính engine của công cụ PDF; trang không có chữ thì OCR (tối đa `READ_OCR_MAX_PAGES`).
 * Không lưu kết quả OCR vào kho dùng chung (`ocr-store`): chữ chưa kiểm tra không được lọt sang chỗ nào khác.
 */
export async function readPdfText(file: File, signal: AbortSignal, onProgress: (progress: PdfReadProgress) => void): Promise<PdfReadResult> {
  const ingested = await ingestFile(file)
  if (!ingested.ok) return { ok: false, code: readErrorFromTool(ingested.code), reason: ingested.reason }
  const { source, pages } = ingested
  if (pages.length > TOOL_LIMITS.totalPages) return { ok: false, code: 'TOO_LARGE' }
  const pageTexts: (string | null)[] = []
  for (const [index, page] of pages.entries()) {
    signal.throwIfAborted()
    onProgress({ stage: 'text', done: index, total: pages.length })
    const text = await loadPageText(source, page).catch(() => ({ runs: [] }))
    pageTexts.push(text.runs.length ? plainText(text) : null)
  }
  const scanned = pages.filter((_, index) => pageTexts[index] === null)
  const targets = scanned.slice(0, READ_OCR_MAX_PAGES)
  const review: OcrReviewPage[] = []
  // tesseract không huỷ được giữa chừng: Huỷ = giết worker, `recognize` đang chờ sẽ ném (như `recognizeMissing` của công cụ PDF).
  const onAbort = () => void stopOcr()
  signal.addEventListener('abort', onAbort)
  try {
    for (const [index, page] of targets.entries()) {
      signal.throwIfAborted()
      onProgress({ stage: 'ocr', done: index, total: targets.length })
      const text = await recognizePipeline(source, page, () => {}, signal)
      if (text.ocr?.words.length) review.push({ source, page, result: text.ocr })
    }
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
  return { ok: true, pending: { name: file.name, pageTexts, review, skippedPages: scanned.length - targets.length } }
}

/** Ghép chữ trang thường + chữ OCR ĐÃ kiểm tra theo thứ tự trang. Còn từ chưa kiểm thì `reviewedPageText` ném. */
export function reviewedPdfText(pending: PdfPendingReview, reviewed: readonly OcrReviewPage[]): string {
  const recognized = new Map(reviewed.map((item) => [item.page.pageIndex, reviewedOcrText(reviewedPageText(item.result))] as const))
  return mergePdfPages(pending.pageTexts, recognized)
}

/** Bộ đệm pdf.js, lớp chữ và worker OCR là biến module dùng chung với công cụ PDF — rời trang thì trả lại. */
export function releasePdfText(): void {
  releaseAll()
  clearTextLayer()
  void stopOcr()
}
