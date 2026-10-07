import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { pdfjsWasmUrl } from '@/utils/pdfjs-wasm'
import { translate } from '@/i18n/runtime'
import type { PdfSource } from '../types/doc-tools.types'
import { CANVAS_CAP, fitScale } from '../utils/canvas-cap'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type PdfDocument = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>

const documents = new Map<string, Promise<PdfDocument>>()

export function openPdf(source: PdfSource): Promise<PdfDocument> {
  let doc = documents.get(source.id)
  if (!doc) {
    // `slice()` BẮT BUỘC: pdf.js chuyển (transfer) ArrayBuffer sang worker, bộ
    // đệm gốc bị tách rời thành 0 byte — lần xuất PDF sau đó đọc ra tệp rỗng.
    doc = pdfjs.getDocument({ data: source.bytes.slice(), wasmUrl: pdfjsWasmUrl(pdfjs.version) }).promise
    documents.set(source.id, doc)
  }
  return doc
}

/**
 * Vẽ một trang PDF ra canvas nền trắng. `extraRotation` cộng thêm vào `/Rotate`
 * sẵn có của trang; `maxSide` / `maxArea` chặn canvas vượt trần của trình duyệt
 * (mặc định `CANVAS_CAP`).
 */
export async function renderPdfPage(
  source: PdfSource,
  pageIndex: number,
  options: { scale: number; extraRotation?: number; maxSide?: number; maxArea?: number },
): Promise<HTMLCanvasElement> {
  const doc = await openPdf(source)
  const page = await doc.getPage(pageIndex + 1)
  const rotation = (page.rotate + (options.extraRotation ?? 0)) % 360

  const cap = { maxSide: options.maxSide ?? CANVAS_CAP.maxSide, maxArea: options.maxArea ?? CANVAS_CAP.maxArea }
  const viewport = page.getViewport({ scale: fitScale(page.getViewport({ scale: 1, rotation }), options.scale, cap), rotation })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error(translate('pdf:errors.noCanvas'))

  // PDF không khai nền → trong suốt; xuất JPEG sẽ thành nền đen.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
  page.cleanup()
  return canvas
}

/** Giải phóng tài liệu pdf.js của một nguồn tạm (PDF vừa dựng để xuất ảnh). */
export function releaseDocument(sourceId: string): void {
  void documents.get(sourceId)?.then((value) => value.loadingTask.destroy(), () => undefined)
  documents.delete(sourceId)
}

/** Giải phóng mọi tài liệu pdf.js — gọi khi làm mới phiên. */
export function releaseAll(): void {
  for (const doc of documents.values()) void doc.then((value) => value.loadingTask.destroy(), () => undefined)
  documents.clear()
}
