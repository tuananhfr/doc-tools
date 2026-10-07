import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Point, Rect, Size } from '../types/image.types'

interface MarkOverlayProps {
  /** Kích thước ảnh (điểm ảnh) — khung che lưu theo đúng hệ này. */
  size: Size
  boxes: Rect[]
  disabled: boolean
  onChange: (boxes: Rect[]) => void
}

type Gesture = { kind: 'draw'; start: Point; screen: Point } | { kind: 'pick'; index: number; start: Point; screen: Point }

/** Khung có cạnh nhỏ hơn mức này (px màn hình) là một cú chạm lỡ tay, không phải vùng cần che. */
const MIN_SIDE = 6
/** Ngón tay bấm vào khung luôn xê dịch vài px — quá mức này mới coi là kéo vẽ khung mới. */
const DRAG_SLOP = 6

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const contains = (box: Rect, p: Point) => p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height
const between = (a: Point, b: Point): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) })

/** Kéo trên ảnh để khoanh vùng cần che; bấm vào khung đã vẽ để bỏ khung đó. */
export function MarkOverlay({ size, boxes, disabled, onChange }: MarkOverlayProps) {
  const { t } = useTranslation('image')
  const gesture = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<Rect | null>(null)

  const read = (event: PointerEvent<SVGSVGElement>): { point: Point; screen: Point; perPixel: number } => {
    const frame = event.currentTarget.getBoundingClientRect()
    return {
      point: {
        x: clamp(((event.clientX - frame.left) / frame.width) * size.width, 0, size.width),
        y: clamp(((event.clientY - frame.top) / frame.height) * size.height, 0, size.height),
      },
      screen: { x: event.clientX, y: event.clientY },
      perPixel: size.width / frame.width,
    }
  }

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0) return
    const { point, screen } = read(event)
    let picked = -1
    // Khung vẽ sau nằm trên: bấm vào chỗ chồng nhau là bỏ khung trên cùng.
    for (let index = boxes.length - 1; index >= 0 && picked < 0; index--) if (contains(boxes[index], point)) picked = index
    gesture.current = picked >= 0 ? { kind: 'pick', index: picked, start: point, screen } : { kind: 'draw', start: point, screen }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current) return
    const { point, screen } = read(event)
    if (current.kind === 'pick') {
      if (Math.hypot(screen.x - current.screen.x, screen.y - current.screen.y) < DRAG_SLOP) return
      gesture.current = { kind: 'draw', start: current.start, screen: current.screen }
    }
    setDraft(between(current.start, point))
  }

  const up = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    gesture.current = null
    const min = MIN_SIDE * read(event).perPixel
    if (current?.kind === 'pick') onChange(boxes.filter((_, index) => index !== current.index))
    else if (draft && draft.width >= min && draft.height >= min) onChange([...boxes, draft])
    setDraft(null)
  }

  const cancel = () => {
    gesture.current = null
    setDraft(null)
  }

  return (
    <svg
      className={`erp-mark${disabled ? ' is-disabled' : ''}`}
      viewBox={`0 0 ${size.width} ${size.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={boxes.length > 0 ? t('mark.overlayBoxes', { count: boxes.length }) : t('mark.overlayEmpty')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      {boxes.map((box, index) => (
        <rect key={index} className="erp-mark__box" x={box.x} y={box.y} width={box.width} height={box.height} vectorEffect="non-scaling-stroke" />
      ))}
      {draft ? <rect className="erp-mark__draft" x={draft.x} y={draft.y} width={draft.width} height={draft.height} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  )
}
