import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { baseToVisual, normalizeRotation, visualSize, visualToBase } from '../utils/page-geometry'
import { fitScale } from '../utils/canvas-cap'
import { rotatedSize } from '../utils/image-sheet'
import { basePageSize, sheetLayoutOf } from './page-size'
import { renderPreview } from './page-preview'
import { ocrRenderScale } from './ocr-render-scale'

/** Recognize original photo pixels, independently of PDF paper, margins and subpixel placement. */
export async function renderOcrInput(source: SourceFile, page: PageRef, nativePhoto = true) {
  const base = await basePageSize(source, page), turn = normalizeRotation(page.rotation)
  const identityBox = (box: { x: number; y: number; width: number; height: number }) => box
  if (source.kind !== 'image' || !nativePhoto) {
    const canvas = await renderPreview(source, page, await ocrRenderScale(source, page))
    return { canvas, pxPerPt: canvas.width / visualSize(base, turn).width, toPreviewBox: identityBox, toBase: (point: { x: number; y: number }) => visualToBase(point, base, turn) }
  }
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  try {
    const native = rotatedSize(bitmap, turn), scale = fitScale(native, 1), canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(native.width * scale)); canvas.height = Math.max(1, Math.floor(native.height * scale))
    const context = canvas.getContext('2d')!
    context.translate(canvas.width / 2, canvas.height / 2); context.rotate(turn * Math.PI / 180)
    context.drawImage(bitmap, -bitmap.width * scale / 2, -bitmap.height * scale / 2, bitmap.width * scale, bitmap.height * scale)
    const slot = (await sheetLayoutOf(source, page.sheet)).slots[0]
    const corners = [{ x: slot.x, y: slot.y }, { x: slot.x + slot.width, y: slot.y }, { x: slot.x, y: slot.y + slot.height }, { x: slot.x + slot.width, y: slot.y + slot.height }].map(point => baseToVisual(point, base, turn))
    const offset = { x: Math.min(...corners.map(point => point.x)), y: Math.min(...corners.map(point => point.y)) }
    const content = rotatedSize(slot, turn), visual = visualSize(base, turn)
    return { canvas, pxPerPt: canvas.width / content.width,
      toPreviewBox: (box: { x: number; y: number; width: number; height: number }) => ({ x: (box.x * content.width + offset.x) / visual.width, y: (box.y * content.height + offset.y) / visual.height, width: box.width * content.width / visual.width, height: box.height * content.height / visual.height }),
      toBase: (point: { x: number; y: number }) => visualToBase({ x: point.x + offset.x, y: point.y + offset.y }, base, turn) }
  } finally { bitmap.close() }
}
