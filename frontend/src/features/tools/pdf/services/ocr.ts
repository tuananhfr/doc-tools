import type { Worker as TesseractWorker } from 'tesseract.js'
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import { withBase } from '@/utils/url'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { PageText } from '../types/text-layer.types'
import { ocrRuns, type OcrLine } from '../utils/ocr-runs'
import { normalizeRotation, visualSize, visualToBase } from '../utils/page-geometry'
import { PDF_CSS_SCALE, renderPreview } from './page-preview'
import { basePageSize } from './page-size'
import { ocrWords } from '../utils/ocr-review'
import { inspectOcrImage, ocrSourceHash } from './ocr-quality'
import { awaitOcrJob } from './ocr-abort'
import { translate } from '@/i18n/runtime'

/**
 * Nhận dạng chữ ngay trên trình duyệt (tesseract.js, tiếng Việt) — tệp không
 * rời máy. Mọi thứ tự phục vụ, không lấy từ CDN: worker + lõi WASM đi theo
 * bản build (có hash), dữ liệu tiếng Việt ở `public/vendor/tesseract/` vì
 * tesseract ghép tên tệp cố định `<langPath>/vie.traineddata.gz` — qua Vite
 * là bị gắn hash, tải 404. Dữ liệu: @tesseract.js-data/vie 1.0.0, bản
 * 4.0.0_best_int (MIT / Apache-2.0 của tessdata).
 */

/** 300 DPI — dưới mức này chữ 9–10 pt của văn bản hành chính đọc sai dấu nhiều. */
const OCR_PX_PER_PT = 300 / 72

export type OcrStage = 'loading' | 'reading'

export interface OcrProgress {
  stage: OcrStage
  /** 0–1 trong giai đoạn hiện tại. */
  progress: number
}

let worker: Promise<TesseractWorker> | null = null
let listener: ((progress: OcrProgress) => void) | null = null

const absolute = (url: string) => new URL(url, window.location.href).href

function getWorker(signal?: AbortSignal): Promise<TesseractWorker> {
  if (!worker) {
    const pending = (async () => {
      const { createWorker, OEM } = await import('tesseract.js')
      const response = await fetch(absolute(withBase('/vendor/tesseract/vie.traineddata.gz')), { signal })
      if (!response.ok) throw new Error(translate('ocr:modelUnavailable'))
      await response.arrayBuffer()
      signal?.throwIfAborted()
      return new Promise<TesseractWorker>((resolve, reject) => { void createWorker('vie', OEM.LSTM_ONLY, {
        workerPath: absolute(workerUrl),
        corePath: absolute(coreUrl),
        langPath: absolute(withBase('/vendor/tesseract')),
        // Không ghi bộ dữ liệu vào IndexedDB — trình duyệt đã cache HTTP, và phiên này hứa không lưu gì.
        cacheMethod: 'none',
        errorHandler: error => reject(new Error(String(error))),
        logger: (message) => {
          if (worker === pending) listener?.({ stage: message.status === 'recognizing text' ? 'reading' : 'loading', progress: message.progress ?? 0 })
        },
      }).then(resolve, reject) })
    })()
    worker = pending
    pending.catch(() => {
      if (worker === pending) worker = null
    })
  }
  return worker
}

export async function recognizeCanvas(canvas: HTMLCanvasElement, onProgress: (progress: OcrProgress) => void, numeric = false, signal?: AbortSignal): Promise<OcrLine[]> {
  listener = onProgress
  try {
    const instance = await awaitOcrJob(getWorker(signal), signal)
    const options: Partial<import('tesseract.js').RecognizeOptions & import('tesseract.js').WorkerParams> = numeric ? { tessedit_char_whitelist: '0123456789.,/-+ ', tessedit_pageseg_mode: '7' as import('tesseract.js').PSM } : {}
    const { data } = await awaitOcrJob(instance.recognize(canvas, options, { blocks: true }), signal)
    return (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines))
  } finally { listener = null }
}

/** Dừng ngay việc đang chạy (tesseract không huỷ được giữa chừng) — lần sau tạo lại worker. */
export async function stopOcr(): Promise<void> {
  const current = worker
  worker = null
  listener = null
  if (current) await current.then((instance) => instance.terminate()).catch(() => undefined)
}

/** Đọc chữ MỘT trang theo hướng đang nhìn, trả lớp chữ ở khung gốc như lớp chữ PDF. */
export async function recognizePage(source: SourceFile, page: PageRef, onProgress: (progress: OcrProgress) => void): Promise<PageText> {
  listener = onProgress
  const base = await basePageSize(source, page)
  const turn = normalizeRotation(page.rotation)
  const canvas = await renderPreview(source, page, OCR_PX_PER_PT / PDF_CSS_SCALE)
  // Trang rất lớn bị kẹp diện tích khi vẽ — tính lại tỉ lệ thật từ canvas.
  const pxPerPt = canvas.width / visualSize(base, turn).width
  const instance = await getWorker()
  const [qualityFlags, sourceHash] = await Promise.all([inspectOcrImage(canvas, source), ocrSourceHash(source)])
  const { data } = await instance.recognize(canvas, {}, { blocks: true })
  const lines: OcrLine[] = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
  const toBase = (point: { x: number; y: number }) => visualToBase(point, base, turn)
  return {
    runs: ocrRuns(lines, pxPerPt, toBase),
    ocr: { sourceId: source.id, pageIndex: page.pageIndex, sourceHash, engine: 'tesseract', engineVersion: '7.0.0/vie-4.0.0_best_int', pass: 'original', qualityFlags,
      words: ocrWords(lines, pxPerPt, toBase, canvas) },
  }
}
