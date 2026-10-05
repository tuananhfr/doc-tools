import type { ImageFormat, Point, Size } from '../types/image.types'
import type { MeasureReference, MeasureShape } from '../types/measure.types'
import { labelAnchor, midpoint, referenceLabel, scaleOf, shapeLabel } from '../utils/measure'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'

/** Màu nét vẽ — lấy từ token của theme lúc xuất, service không tự chọn màu. */
export interface MeasureColors {
  /** Đoạn đo, vùng đo, điểm đếm. */
  line: string
  /** Đoạn chuẩn. */
  reference: string
  /** Viền sáng quanh nét và chữ trên nhãn: nét vẽ phải đọc được trên mọi nền ảnh. */
  halo: string
}

/**
 * Cỡ nét tính theo ảnh, không theo màn hình: ảnh 12 MP mà vẽ nét 2 điểm ảnh thì
 * mở ra không thấy gì. 900 = bề rộng vùng xem lúc đo, nên ảnh xuất trông giống
 * lúc đang đo.
 */
function unitOf(size: Size): number {
  return Math.max(size.width, size.height) / 900
}

function strokePath(context: CanvasRenderingContext2D, points: Point[], closed: boolean, color: string, halo: string, unit: number, dash: number[] = []) {
  context.beginPath()
  points.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
  if (closed) context.closePath()
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.setLineDash([])
  context.strokeStyle = halo
  context.lineWidth = 5 * unit
  context.stroke()
  context.setLineDash(dash)
  context.strokeStyle = color
  context.lineWidth = 2.5 * unit
  context.stroke()
  context.setLineDash([])
}

function dot(context: CanvasRenderingContext2D, point: Point, radius: number, color: string, halo: string, unit: number) {
  context.beginPath()
  context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  context.strokeStyle = halo
  context.lineWidth = 1.5 * unit
  context.stroke()
}

/** `above`: nhãn nằm TRÊN điểm neo — đoạn ngắn mà nhãn đè lên thì che mất chính đoạn đó. */
function label(context: CanvasRenderingContext2D, text: string, anchor: Point, color: string, halo: string, unit: number, bounds: Size, above = false) {
  const at = above ? { x: anchor.x, y: anchor.y - 21 * unit } : anchor
  context.font = `600 ${14 * unit}px Inter, system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const width = context.measureText(text).width + 12 * unit
  const height = 22 * unit
  // Nhãn không được thò ra ngoài ảnh: đoạn đo sát mép vẫn phải đọc được số.
  const x = Math.min(Math.max(at.x, width / 2), bounds.width - width / 2)
  const y = Math.min(Math.max(at.y, height / 2), bounds.height - height / 2)
  context.beginPath()
  context.roundRect(x - width / 2, y - height / 2, width, height, 4 * unit)
  context.fillStyle = color
  context.fill()
  context.strokeStyle = halo
  context.lineWidth = unit
  context.stroke()
  context.fillStyle = halo
  context.fillText(text, x, y)
}

/** Vẽ ảnh gốc ở độ phân giải gốc rồi đè đoạn chuẩn, các đoạn / vùng đo và điểm đếm lên trên. */
export async function renderMeasured(
  source: Blob,
  shapes: MeasureShape[],
  reference: MeasureReference | null,
  colors: MeasureColors,
  format: ImageFormat,
): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(source)
  try {
    const size = { width: bitmap.width, height: bitmap.height }
    const unit = unitOf(size)
    const scale = scaleOf(reference)
    const { canvas, context } = createCanvas(size)
    try {
      if (format === 'jpeg') {
        context.fillStyle = 'white'
        context.fillRect(0, 0, size.width, size.height)
      }
      context.drawImage(bitmap, 0, 0)

      if (reference) {
        strokePath(context, reference.points, false, colors.reference, colors.halo, unit, [8 * unit, 6 * unit])
        for (const point of reference.points) dot(context, point, 4 * unit, colors.reference, colors.halo, unit)
        if (scale) label(context, referenceLabel(reference, scale), midpoint(...reference.points), colors.reference, colors.halo, unit, size, true)
      }

      for (const shape of shapes) {
        if (shape.kind === 'count') {
          dot(context, shape.points[0], 11 * unit, colors.line, colors.halo, unit)
          context.font = `700 ${12 * unit}px Inter, system-ui, sans-serif`
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.fillStyle = colors.halo
          context.fillText(shapeLabel(shape, shapes, scale), shape.points[0].x, shape.points[0].y)
          continue
        }
        if (shape.kind === 'area') {
          context.beginPath()
          shape.points.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
          context.closePath()
          context.globalAlpha = 0.18
          context.fillStyle = colors.line
          context.fill()
          context.globalAlpha = 1
        }
        strokePath(context, shape.points, shape.kind === 'area', colors.line, colors.halo, unit)
        for (const point of shape.points) dot(context, point, 4 * unit, colors.line, colors.halo, unit)
        label(context, shapeLabel(shape, shapes, scale), labelAnchor(shape), colors.line, colors.halo, unit, size, shape.kind === 'distance')
      }

      return { blob: await encodeCanvas(canvas, format), size }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}
