import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { Rect, Size } from '../types/image.types'
import { CROP_HANDLES, moveRect, resizeRect, type CropHandle } from '../utils/crop-rect'

interface CropBoxProps {
  /** Kích thước ảnh đang hiện (điểm ảnh của ảnh, đã tính xoay). */
  bounds: Size
  rect: Rect
  /** Rộng / cao phải giữ; null = kéo tự do. */
  aspect: number | null
  disabled?: boolean
  onChange: (rect: Rect) => void
}

const HANDLE_LABEL: Record<CropHandle, string> = {
  nw: 'Góc trên trái',
  n: 'Cạnh trên',
  ne: 'Góc trên phải',
  e: 'Cạnh phải',
  se: 'Góc dưới phải',
  s: 'Cạnh dưới',
  sw: 'Góc dưới trái',
  w: 'Cạnh trái',
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

const percent = (value: number, total: number) => `${(value / total) * 100}%`

/**
 * Khung cắt phủ lên ảnh: kéo thân để dời, kéo tám tay nắm để đổi cỡ, phím mũi
 * tên làm cả hai việc (giữ Shift đi 10 bước). Phải nằm trong một phần tử có
 * `position: relative` và đúng tỉ lệ của ảnh.
 */
export function CropBox({ bounds, rect, aspect, disabled, onChange }: CropBoxProps) {
  const root = useRef<HTMLDivElement>(null)
  // Lúc bắt đầu kéo: khung + vị trí con trỏ. Tính từ mốc này chứ không cộng dồn từng bước —
  // cộng dồn thì con trỏ chạm mép ảnh rồi quay lại là khung lệch khỏi con trỏ.
  const drag = useRef<{ rect: Rect; x: number; y: number; handle: CropHandle | null } | null>(null)

  /** Số điểm ảnh của ảnh ứng với một điểm trên màn hình. */
  const ratio = () => bounds.width / (root.current?.clientWidth || bounds.width)

  // Tay nắm tự khai mình qua `data-handle`; thân khung không có thuộc tính đó = dời cả khung.
  const handleOf = (element: HTMLElement) => (element.dataset.handle as CropHandle | undefined) ?? null

  const start = (event: PointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    drag.current = { rect, x: event.clientX, y: event.clientY, handle: handleOf(event.currentTarget) }
  }

  const track = (event: PointerEvent<HTMLElement>) => {
    const from = drag.current
    if (!from) return
    const dx = (event.clientX - from.x) * ratio()
    const dy = (event.clientY - from.y) * ratio()
    onChange(from.handle ? resizeRect(from.rect, from.handle, dx, dy, bounds, aspect) : moveRect(from.rect, dx, dy, bounds))
  }

  const stop = () => {
    drag.current = null
  }

  const key = (event: KeyboardEvent<HTMLElement>) => {
    const arrow = ARROWS[event.key]
    if (!arrow || disabled) return
    const handle = handleOf(event.currentTarget)
    event.preventDefault()
    event.stopPropagation()
    // Một lần nhấn = một điểm trên màn hình, để bước đi nhìn thấy được ở mọi cỡ ảnh.
    const step = ratio() * (event.shiftKey ? 10 : 1)
    const [dx, dy] = [arrow[0] * step, arrow[1] * step]
    onChange(handle ? resizeRect(rect, handle, dx, dy, bounds, aspect) : moveRect(rect, dx, dy, bounds))
  }

  const box = { left: percent(rect.x, bounds.width), top: percent(rect.y, bounds.height), width: percent(rect.width, bounds.width), height: percent(rect.height, bounds.height) }

  return (
    <div ref={root} className={`erp-crop${disabled ? ' is-disabled' : ''}`}>
      <div className="erp-crop__mask" aria-hidden="true">
        <div className="erp-crop__shade" style={box} />
      </div>
      <div
        className="erp-crop__box"
        role="group"
        aria-label="Khung cắt — kéo hoặc dùng phím mũi tên để dời"
        tabIndex={disabled ? -1 : 0}
        style={box}
        onPointerDown={start}
        onPointerMove={track}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={key}
      >
        <span className="erp-crop__thirds" aria-hidden="true" />
        {CROP_HANDLES.map((handle) => (
          <button
            key={handle}
            type="button"
            className={`erp-crop__handle erp-crop__handle--${handle}`}
            aria-label={`${HANDLE_LABEL[handle]} — kéo hoặc dùng phím mũi tên để đổi cỡ`}
            data-handle={handle}
            disabled={disabled}
            onPointerDown={start}
            onPointerMove={track}
            onPointerUp={stop}
            onPointerCancel={stop}
            onKeyDown={key}
          />
        ))}
      </div>
    </div>
  )
}
