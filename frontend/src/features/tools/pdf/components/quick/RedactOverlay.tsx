import { useRef, useState, type PointerEvent } from 'react'
import type { Rect } from '../../types/markup.types'
import type { Point, Size } from '../../utils/page-geometry'

interface RedactOverlayProps {
  /** Khổ trang nhìn thấy (pt) — khung che lưu theo đúng hệ này. */
  size: Size
  boxes: Rect[]
  disabled: boolean
  onChange: (boxes: Rect[]) => void
}

type Gesture = { kind: 'draw'; start: Point } | { kind: 'pick'; index: number; start: Point }

/** Khung nhỏ hơn mức này (pt) là một cú chạm lỡ tay, không phải vùng cần che. */
const MIN_SIDE = 4
/** Ngón tay bấm vào khung luôn xê dịch vài pt — quá mức này mới coi là kéo vẽ khung mới. */
const DRAG_SLOP = 4

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const contains = (box: Rect, p: Point) => p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height
const between = (a: Point, b: Point): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) })

/** Kéo trên trang để khoanh vùng cần che; bấm vào khung đã vẽ để bỏ khung đó. */
export function RedactOverlay({ size, boxes, disabled, onChange }: RedactOverlayProps) {
  const gesture = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)

  const toPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const frame = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp(((event.clientX - frame.left) / frame.width) * size.width, 0, size.width),
      y: clamp(((event.clientY - frame.top) / frame.height) * size.height, 0, size.height),
    }
  }

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0) return
    const start = toPoint(event)
    let picked = -1
    // Khung vẽ sau nằm trên: bấm vào chỗ chồng nhau là bỏ khung trên cùng.
    for (let index = boxes.length - 1; index >= 0 && picked < 0; index--) if (contains(boxes[index], start)) picked = index
    gesture.current = picked >= 0 ? { kind: 'pick', index: picked, start } : { kind: 'draw', start }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current) return
    const p = toPoint(event)
    if (current.kind === 'pick') {
      if (Math.hypot(p.x - current.start.x, p.y - current.start.y) < DRAG_SLOP) return
      gesture.current = { kind: 'draw', start: current.start }
    }
    setDraft(between(current.start, p))
  }

  const up = () => {
    const current = gesture.current
    gesture.current = null
    if (current?.kind === 'pick') onChange(boxes.filter((_, index) => index !== current.index))
    else if (draft && draft.width >= MIN_SIDE && draft.height >= MIN_SIDE) onChange([...boxes, draft])
    setDraft(null)
  }

  const cancel = () => {
    gesture.current = null
    setDraft(null)
  }

  return (
    <svg
      className={`erp-redact${disabled ? ' is-disabled' : ''}`}
      viewBox={`0 0 ${size.width} ${size.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={boxes.length > 0 ? `${boxes.length} khung che trên trang này` : 'Chưa có khung che trên trang này'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      {boxes.map((box, index) => (
        <rect key={index} className="erp-redact__box" x={box.x} y={box.y} width={box.width} height={box.height} vectorEffect="non-scaling-stroke" />
      ))}
      {draft ? <rect className="erp-redact__draft" x={draft.x} y={draft.y} width={draft.width} height={draft.height} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  )
}
