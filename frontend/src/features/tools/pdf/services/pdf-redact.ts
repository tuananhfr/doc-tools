import type { PDFDocument, PDFPage } from 'pdf-lib'
import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob } from '@/features/tools/shared'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { fitScale } from '../utils/canvas-cap'
import { redactBoxes, runsOutside } from '../utils/redaction'
import { basePageSize } from './page-size'
import type { FontLoader } from './pdf-fonts'
import { drawOcrText } from './pdf-ocr-layer'
import { renderPdfPage } from './pdf-render'
import { paintRedactions, renderSheet } from './pdf-to-image'
import { loadPageText } from './text-layer'

/** Đủ nét để đọc và in lại chữ cỡ 8 pt; cao hơn thì mỗi trang xoá phình vài MB. */
const REDACT_DPI = 200

async function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, 'image/jpeg').catch(() => null)
  if (!blob) throw new ToolError(TOOL_ERROR.exportFailed, 'Không dựng được ảnh trang.')
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Trang có khung xoá → một trang MỚI chỉ gồm ảnh đã tô đen + lớp chữ ẩn ngoài
 * khung. Không chép gì từ trang gốc (nội dung, form, liên kết, layer ẩn) — tô
 * đen trên nội dung vector chỉ là che, chữ bên dưới vẫn chép ra được.
 * Dấu tay khác trên trang do nơi gọi vẽ tiếp; xoay thêm áp SAU cùng.
 */
export async function addRedactedPage(output: PDFDocument, ref: PageRef, source: SourceFile, fonts: FontLoader): Promise<PDFPage> {
  const base = await basePageSize(source, ref)
  const scale = fitScale(base, REDACT_DPI / 72)
  const canvas =
    source.kind === 'pdf' ? await renderPdfPage(source, ref.pageIndex, { scale, extraRotation: 0 }) : await renderSheet(source, ref.sheet, 0, scale)
  const boxes = redactBoxes(ref.markups)
  paintRedactions(canvas, boxes, base, 0)

  const image = await output.embedJpg(await canvasJpeg(canvas))
  canvas.width = 0
  const page = output.addPage([base.width, base.height])
  page.drawImage(image, { x: 0, y: 0, width: base.width, height: base.height })

  const text = await loadPageText(source, ref)
  await drawOcrText(page, runsOutside(text.runs, boxes), fonts)
  return page
}
