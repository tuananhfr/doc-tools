import { useRef, type PointerEvent } from 'react'
import type { ImageStamp } from '../../types/decorations.types'
import type { Rect } from '../../types/markup.types'
import { layoutStampAt } from '../../utils/decorations'
import type { Point, Size } from '../../utils/page-geometry'

interface SignOverlayProps {
  /** Khổ trang nhìn thấy (pt). */
  size: Size
  /** Tâm từng chữ ký trên trang này, theo tỉ lệ trang (0–1). */
  spots: readonly Point[]
  stamp: Pick<ImageStamp, 'aspect' | 'widthRatio'>
  /** Ảnh chữ ký để vẽ lên trang. */
  url: string
  disabled: boolean
  onChange: (spots: Point[]) => void
}

interface Gesture {
  index: number
  /** Từ điểm bấm tới tâm chữ ký — kéo không làm chữ ký nhảy về dưới con trỏ. */
  grab: Point
  start: Point
  /** Chữ ký vừa đặt bằng chính lần bấm này: nhả tay không được coi là "bấm để bỏ". */
  fresh: boolean
  moved: boolean
}

/** Ngón tay bấm luôn xê dịch vài điểm ảnh — quá mức này (tỉ lệ trang) mới coi là kéo. */
const DRAG_SLOP = 0.008

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const inside = (rect: Rect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
const percent = (value: number, whole: number) => `${(value / whole) * 100}%`

/** Bấm lên trang để đặt chữ ký, kéo để dời, bấm vào chữ ký đã đặt để bỏ. */
export function SignOverlay({ size, spots, stamp, url, disabled, onChange }: SignOverlayProps) {
  const gesture = useRef<Gesture | null>(null)
  const rects = spots.map((spot) => layoutStampAt(stamp, size, spot))

  const toPoint = (event: PointerEvent<HTMLDivElement>): Point => {
    const frame = event.currentTarget.getBoundingClientRect()
    return { x: clamp((event.clientX - frame.left) / frame.width), y: clamp((event.clientY - frame.top) / frame.height) }
  }

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return
    const point = toPoint(event)
    let picked = -1
    // Chữ ký đặt sau nằm trên: bấm vào chỗ chồng nhau là cầm cái trên cùng.
    for (let index = rects.length - 1; index >= 0 && picked < 0; index--) if (inside(rects[index], point.x * size.width, point.y * size.height)) picked = index
    if (picked >= 0) {
      const rect = rects[picked]
      // Tâm THẬT của khung (đã kẹp trong trang), không phải tâm đã lưu — hai cái lệch nhau khi chữ ký sát mép.
      const centre = { x: (rect.x + rect.width / 2) / size.width, y: (rect.y + rect.height / 2) / size.height }
      gesture.current = { index: picked, grab: { x: centre.x - point.x, y: centre.y - point.y }, start: point, fresh: false, moved: false }
    } else {
      gesture.current = { index: spots.length, grab: { x: 0, y: 0 }, start: point, fresh: true, moved: false }
      onChange([...spots, point])
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current) return
    const point = toPoint(event)
    if (!current.moved && Math.hypot(point.x - current.start.x, point.y - current.start.y) < DRAG_SLOP) return
    current.moved = true
    onChange(spots.map((spot, index) => (index === current.index ? { x: clamp(point.x + current.grab.x), y: clamp(point.y + current.grab.y) } : spot)))
  }

  const up = () => {
    const current = gesture.current
    gesture.current = null
    if (current && !current.fresh && !current.moved) onChange(spots.filter((_, index) => index !== current.index))
  }

  return (
    <div
      className={`erp-sign${disabled ? ' is-disabled' : ''}`}
      role="img"
      aria-label={spots.length > 0 ? `${spots.length} chữ ký trên trang này` : 'Chưa đặt chữ ký trên trang này'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        gesture.current = null
      }}
    >
      {rects.map((rect, index) => (
        <img
          key={index}
          src={url}
          alt=""
          draggable={false}
          className="erp-sign__mark"
          style={{ left: percent(rect.x, size.width), top: percent(rect.y, size.height), width: percent(rect.width, size.width), height: percent(rect.height, size.height) }}
        />
      ))}
    </div>
  )
}
