import type { Point, Size } from '../types/orientation.types'
import type { CompassShape } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'

const FONT = 'Inter, system-ui, sans-serif'

function tracePath(context: CanvasRenderingContext2D, points: Point[], closed: boolean) {
  context.beginPath()
  points.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
  if (closed) context.closePath()
}

/** Vẽ danh sách hình lên canvas — cùng danh sách với bản xem SVG (`ShapeLayer`). */
export function drawShapes(context: CanvasRenderingContext2D, shapes: CompassShape[], palette: CompassPalette, opacity: number): void {
  context.save()
  for (const shape of shapes) {
    const color = palette[shape.role]
    context.globalAlpha = shape.role === 'disc' ? opacity * 0.82 : opacity
    switch (shape.kind) {
      case 'circle':
        context.beginPath()
        context.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2)
        if (shape.fill) {
          context.fillStyle = color
          context.fill()
        } else {
          context.strokeStyle = color
          context.lineWidth = shape.width
          context.stroke()
        }
        break
      case 'line':
        context.beginPath()
        context.moveTo(shape.from.x, shape.from.y)
        context.lineTo(shape.to.x, shape.to.y)
        context.setLineDash(shape.dash ?? [])
        context.lineCap = 'round'
        context.strokeStyle = color
        context.lineWidth = shape.width
        context.stroke()
        context.setLineDash([])
        break
      case 'polygon':
        tracePath(context, shape.points, true)
        context.fillStyle = color
        context.fill()
        break
      case 'arc': {
        // Góc của hình đo từ phía trên theo chiều kim đồng hồ; canvas đo từ trục x.
        const start = ((shape.start - 90) * Math.PI) / 180
        const end = ((shape.end - 90) * Math.PI) / 180
        context.beginPath()
        context.arc(shape.center.x, shape.center.y, shape.outer, start, end, false)
        context.arc(shape.center.x, shape.center.y, shape.inner, end, start, true)
        context.closePath()
        context.fillStyle = color
        context.fill()
        break
      }
      case 'path':
        tracePath(context, shape.points, shape.closed)
        if (shape.fill) {
          context.globalAlpha = 0.12 * opacity
          context.fillStyle = color
          context.fill()
          context.globalAlpha = opacity
        }
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.strokeStyle = palette.halo
        context.lineWidth = shape.width * 2
        context.stroke()
        context.setLineDash(shape.dash ?? [])
        context.strokeStyle = color
        context.lineWidth = shape.width
        context.stroke()
        context.setLineDash([])
        break
      case 'text':
        context.save()
        context.translate(shape.at.x, shape.at.y)
        if (shape.rotate) context.rotate((shape.rotate * Math.PI) / 180)
        context.font = `${shape.weight} ${shape.size}px ${FONT}`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        if (shape.halo !== false) {
          // Viền sáng quanh chữ: nhãn kim nằm ngoài đĩa la bàn, đè thẳng lên ảnh.
          context.lineJoin = 'round'
          context.strokeStyle = palette.halo
          context.lineWidth = shape.size * 0.28
          context.strokeText(shape.text, 0, 0)
        }
        context.fillStyle = color
        context.fillText(shape.text, 0, 0)
        context.restore()
        break
    }
  }
  context.restore()
}

/**
 * Hộp chú thích ở góc dưới-trái. `unit` = cỡ chữ cơ sở theo mặt vẽ: ảnh 4000 px
 * mà chữ 14 px thì in ra không đọc được.
 */
export function drawLegend(context: CanvasRenderingContext2D, lines: string[], bounds: Size, unit: number, palette: CompassPalette): void {
  if (lines.length === 0) return
  context.save()
  const size = 13 * unit
  const gap = size * 0.5
  const pad = size * 0.8
  context.font = `600 ${size}px ${FONT}`
  const width = Math.min(Math.max(...lines.map((line) => context.measureText(line).width)) + pad * 2, bounds.width - pad * 2)
  const height = lines.length * size + (lines.length - 1) * gap + pad * 2
  const origin: Point = { x: pad, y: bounds.height - height - pad }

  context.globalAlpha = 0.9
  context.fillStyle = palette.disc
  context.beginPath()
  context.roundRect(origin.x, origin.y, width, height, size * 0.4)
  context.fill()
  context.globalAlpha = 1
  context.strokeStyle = palette.sector
  context.lineWidth = unit
  context.stroke()

  context.textAlign = 'left'
  context.textBaseline = 'top'
  lines.forEach((line, index) => {
    // Dòng đầu là số đo chính — đậm hơn; dòng cuối là nguồn gốc, nhạt hơn.
    const last = index === lines.length - 1
    context.font = `${index === 0 ? 700 : last ? 400 : 600} ${size}px ${FONT}`
    context.fillStyle = last ? palette.tick : palette.label
    context.fillText(line, origin.x + pad, origin.y + pad + index * (size + gap), width - pad * 2)
  })
  context.restore()
}
