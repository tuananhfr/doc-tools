import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob, type CanvasMime } from '@/features/tools/shared'
import type { ImageFormat, ImageSheet, ImageSource, PageRef, SheetSource, SourceFile } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { fitScale } from '../utils/canvas-cap'
import { isDefaultSheet } from '../utils/image-sheet'
import { normalizeRotation, type QuarterTurn, type Size } from '../utils/page-geometry'
import { canvasRedactRects, redactBoxes } from '../utils/redaction'
import { basePageSize, sheetLayoutOf, sheetParts } from './page-size'
import { renderPdfPage } from './pdf-render'

const MIME: Record<ImageFormat, CanvasMime> = { jpeg: 'image/jpeg', png: 'image/png' }

async function encodePage(canvas: HTMLCanvasElement, format: ImageFormat): Promise<Blob> {
  const blob = await canvasToBlob(canvas, MIME[format]).catch(() => null)
  if (!blob) throw new ToolError(TOOL_ERROR.exportFailed, 'Không xuất được ảnh.')
  return blob
}

/** Ảnh nguồn → canvas đã áp xoay. `scale` < 1 cho bản xem trước; `maxArea` chặn trần canvas. */
export async function renderImagePage(
  source: ImageSource,
  rotation: number,
  scale = 1,
  maxArea = Infinity,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  try {
    const fit = Math.min(scale, Math.sqrt(maxArea / (bitmap.width * bitmap.height)))
    const width = bitmap.width * fit
    const height = bitmap.height * fit
    const sideways = rotation === 90 || rotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sideways ? height : width)
    canvas.height = Math.round(sideways ? width : height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không cấp được canvas.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((rotation * Math.PI) / 180)
    context.drawImage(bitmap, -width / 2, -height / 2, width, height)
    return canvas
  } finally {
    bitmap.close()
  }
}

/**
 * Trang ảnh / trang gộp vẽ thành tờ giấy như lúc xuất PDF (nền trắng, ảnh đặt
 * theo `layoutSheet`), đã áp xoay trang. `pxPerPt` = điểm ảnh canvas / pt.
 */
export async function renderSheet(
  source: SheetSource,
  sheet: ImageSheet | undefined,
  rotation: number,
  pxPerPt: number,
  maxArea = Infinity,
): Promise<HTMLCanvasElement> {
  const layout = await sheetLayoutOf(source, sheet)
  const scale = Math.min(pxPerPt, Math.sqrt(maxArea / (layout.size.width * layout.size.height)))
  const width = layout.size.width * scale
  const height = layout.size.height * scale
  const sideways = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sideways ? height : width)
  canvas.height = Math.round(sideways ? width : height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Trình duyệt không cấp được canvas.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((rotation * Math.PI) / 180)
  context.translate(-width / 2, -height / 2)

  const parts = sheetParts(source)
  for (const [index, part] of parts.entries()) {
    const slot = layout.slots[index]
    const bitmap = await createImageBitmap(new Blob([part.source.bytes], { type: part.source.mime }))
    try {
      const turned = part.rotation === 90 || part.rotation === 270
      const drawWidth = (turned ? slot.height : slot.width) * scale
      const drawHeight = (turned ? slot.width : slot.height) * scale
      context.save()
      context.translate((slot.x + slot.width / 2) * scale, (slot.y + slot.height / 2) * scale)
      context.rotate((part.rotation * Math.PI) / 180)
      context.drawImage(bitmap, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      context.restore()
    } finally {
      bitmap.close()
    }
  }
  return canvas
}

/** Tô đen khung xoá lên canvas đã vẽ trang (khung gốc `base`, xoay thêm `turn`). */
export function paintRedactions(canvas: HTMLCanvasElement, boxes: Rect[], base: Size, turn: QuarterTurn): void {
  if (boxes.length === 0) return
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Trình duyệt không cấp được canvas.')
  context.fillStyle = '#000000'
  for (const rect of canvasRedactRects(boxes, base, turn, canvas)) context.fillRect(rect.x, rect.y, rect.width, rect.height)
}

export interface PageImage {
  blob: Blob
  /** DPI thật đã vẽ — thấp hơn DPI xin khi trang khổ lớn chạm trần canvas. */
  dpi: number
}

/**
 * Một trang → một ảnh, đã áp xoay. Trang ảnh để khổ mặc định xuất nguyên ảnh
 * gốc (không kèm lề giấy trắng); đã chọn khổ giấy hay là trang gộp thì xuất cả
 * tờ ở `dpi`, hạ xuống cho vừa trần canvas.
 */
export async function renderPageImage(
  ref: PageRef,
  source: SourceFile,
  format: ImageFormat,
  dpi: number,
): Promise<PageImage> {
  const boxes = redactBoxes(ref.markups)
  // Ảnh gốc không kèm lề giấy thì khung xoá (đo theo tờ giấy) không khớp — trang có xoá luôn vẽ cả tờ.
  if (source.kind === 'image' && isDefaultSheet(ref.sheet) && boxes.length === 0) {
    return { blob: await encodePage(await renderImagePage(source, ref.rotation), format), dpi }
  }
  const base = await basePageSize(source, ref)
  const scale = fitScale(base, dpi / 72)
  const canvas =
    source.kind === 'pdf'
      ? await renderPdfPage(source, ref.pageIndex, { scale, extraRotation: ref.rotation })
      : await renderSheet(source, ref.sheet, ref.rotation, scale)
  paintRedactions(canvas, boxes, base, normalizeRotation(ref.rotation))
  return { blob: await encodePage(canvas, format), dpi: scale * 72 }
}
