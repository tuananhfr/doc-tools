import { useRef, type PointerEvent } from 'react'
import type { Rect } from '../types/markup.types'
import type { Point, Size } from '../utils/page-geometry'

interface CropOverlayProps {
  /** Khổ trang nhìn thấy (pt). */
  size: Size
  rect: Rect | null
  onChange: (rect: Rect | null) => void
}

type Gesture = { kind: 'draw'; start: Point } | { kind: 'move'; start: Point; origin: Rect }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Kéo trên trang để chọn phần GIỮ LẠI; kéo bên trong khung để dời khung. Phần
 * bị cắt bỏ phủ tối — người dùng thấy ngay trang sẽ còn lại những gì.
 */
export function CropOverlay({ size, rect, onChange }: CropOverlayProps) {
  const gesture = useRef<Gesture | null>(null)

  const toPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp(((event.clientX - box.left) / box.width) * size.width, 0, size.width),
      y: clamp(((event.clientY - box.top) / box.height) * size.height, 0, size.height),
    }
  }

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const p = toPoint(event)
    const inside = rect && p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
    gesture.current = inside ? { kind: 'move', start: p, origin: rect } : { kind: 'draw', start: p }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current) return
    const p = toPoint(event)
    if (current.kind === 'draw') {
      onChange({
        x: Math.min(current.start.x, p.x),
        y: Math.min(current.start.y, p.y),
        width: Math.abs(p.x - current.start.x),
        height: Math.abs(p.y - current.start.y),
      })
      return
    }
    const { origin } = current
    onChange({
      ...origin,
      x: clamp(origin.x + p.x - current.start.x, 0, size.width - origin.width),
      y: clamp(origin.y + p.y - current.start.y, 0, size.height - origin.height),
    })
  }

  const up = () => {
    gesture.current = null
  }

  const { width, height } = size
  const shade = rect
    ? `M0 0H${width}V${height}H0Z M${rect.x} ${rect.y}V${rect.y + rect.height}H${rect.x + rect.width}V${rect.y}Z`
    : ''

  return (
    <svg
      className={`erp-doc-crop${rect ? ' has-rect' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Vùng cắt trang"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {rect ? (
        <>
          <path className="erp-doc-crop__shade" d={shade} fillRule="evenodd" />
          <rect className="erp-doc-crop__box" x={rect.x} y={rect.y} width={rect.width} height={rect.height} vectorEffect="non-scaling-stroke" />
        </>
      ) : null}
    </svg>
  )
}
