import type { ImageFormat, Size } from '../types/image.types'
import type { MarkState } from '../types/mark.types'
import { MARK_COLOR, stampFit, stampFontSize, stampMargin, stampOrigin, TILE_ANGLE, tileCenters } from '../utils/mark'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'

/** Phông của giao diện — bản xem trước và ảnh ra phải cùng một phông thì dấu mới nằm đúng chỗ. */
function fontFamily(): string {
  return getComputedStyle(document.body).fontFamily || 'sans-serif'
}

/**
 * Vẽ khung che + dấu chữ lên một canvas ĐÃ có ảnh. `image` là kích thước ảnh
 * gốc mà khung che tính theo; canvas có thể nhỏ hơn (bản xem trước) — mọi số đo
 * của dấu tính theo canvas nên hai nơi ra cùng một bố cục.
 */
export function paintMarks(context: CanvasRenderingContext2D, canvas: Size, image: Size, state: MarkState): void {
  const scale = canvas.width / image.width
  context.save()
  context.fillStyle = MARK_COLOR.black
  for (const box of state.boxes) {
    // Nới ra mép điểm ảnh: khung lẻ nửa điểm để lại một viền mờ còn đọc được chữ bên dưới.
    const left = Math.floor(box.x * scale)
    const top = Math.floor(box.y * scale)
    context.fillRect(left, top, Math.ceil((box.x + box.width) * scale) - left, Math.ceil((box.y + box.height) * scale) - top)
  }
  context.restore()

  const text = state.stamp.text.trim()
  if (!text) return

  context.save()
  const family = fontFamily()
  let fontSize = stampFontSize(canvas, state.stamp.sizeRatio)
  const margin = stampMargin(fontSize)
  context.font = `700 ${fontSize}px ${family}`
  if (!state.stamp.tile) {
    fontSize = Math.max(6, Math.floor(fontSize * stampFit(canvas, context.measureText(text).width, margin)))
    context.font = `700 ${fontSize}px ${family}`
  }
  const width = context.measureText(text).width
  context.fillStyle = MARK_COLOR[state.stamp.color]
  context.globalAlpha = state.stamp.opacity
  context.textBaseline = 'middle'

  if (state.stamp.tile) {
    context.textAlign = 'center'
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(TILE_ANGLE)
    for (const center of tileCenters(canvas, { width, height: fontSize })) context.fillText(text, center.x, center.y)
  } else {
    const origin = stampOrigin(canvas, { width, height: fontSize }, state.stamp.anchor, margin)
    context.textAlign = 'left'
    context.fillText(text, origin.x, origin.y + fontSize / 2)
  }
  context.restore()
}

/** Dựng ảnh ra ở ĐỘ PHÂN GIẢI GỐC: ảnh gốc + khung che + dấu, ghi thẳng vào điểm ảnh. */
export async function renderMarked(source: Blob, state: MarkState, format: ImageFormat): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(source)
  try {
    const size = { width: bitmap.width, height: bitmap.height }
    const { canvas, context } = createCanvas(size)
    try {
      if (format === 'jpeg') {
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.drawImage(bitmap, 0, 0)
      paintMarks(context, size, size, state)
      return { blob: await encodeCanvas(canvas, format), size }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}
