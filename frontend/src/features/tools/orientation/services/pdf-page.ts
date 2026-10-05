import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { TOOL_ERROR, ToolError } from '@/features/tools/hub'

/*
 * Tệp này kéo pdf.js — CHỈ được nạp bằng `await import()` lúc người dùng chọn PDF.
 * Người chỉ dùng ảnh hoặc la bàn không bao giờ tải pdf.js (xem `startupGuard`).
 * Không import `features/tools/pdf`: chunk đó mang cả trình chỉnh sửa.
 */
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type PdfDocument = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>

const documents = new WeakMap<Uint8Array, Promise<PdfDocument>>()

function open(bytes: Uint8Array): Promise<PdfDocument> {
  let doc = documents.get(bytes)
  if (!doc) {
    // `slice()`: pdf.js chuyển ArrayBuffer sang worker và làm rỗng bản gốc — lúc xuất PDF còn cần lại.
    doc = pdfjs.getDocument({ data: bytes.slice() }).promise.catch((error: unknown) => {
      documents.delete(bytes)
      if (error instanceof Error && error.name === 'PasswordException') {
        throw new ToolError(TOOL_ERROR.permission, 'PDF có mật khẩu mở — gỡ mật khẩu bằng công cụ "Mở khoá PDF" rồi chọn lại.')
      }
      throw new ToolError(TOOL_ERROR.corruptFile, 'Không đọc được tệp PDF này.')
    })
    documents.set(bytes, doc)
  }
  return doc
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  return (await open(bytes)).numPages
}

export interface RenderedPage {
  blob: Blob
  width: number
  height: number
  /** Kích thước trang như người xem thấy (đã xoay theo /Rotate), đơn vị điểm PDF. */
  points: { width: number; height: number }
}

/** Vẽ trang `index` (đếm từ 0) ra PNG nền trắng, cạnh dài `longSide` điểm ảnh. */
export async function renderPdfPage(bytes: Uint8Array, index: number, longSide: number): Promise<RenderedPage> {
  const doc = await open(bytes)
  const page = await doc.getPage(index + 1)
  try {
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: longSide / Math.max(base.width, base.height) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new ToolError(TOOL_ERROR.memory, 'Trình duyệt không cấp được vùng vẽ.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    const { width, height } = canvas
    canvas.width = 0
    canvas.height = 0
    if (!blob) throw new ToolError(TOOL_ERROR.memory, 'Không vẽ được trang PDF.')
    return { blob, width, height, points: { width: base.width, height: base.height } }
  } finally {
    page.cleanup()
  }
}

export function releasePdf(bytes: Uint8Array): void {
  void documents.get(bytes)?.then((doc) => doc.loadingTask.destroy(), () => undefined)
  documents.delete(bytes)
}
