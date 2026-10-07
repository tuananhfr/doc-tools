import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageItem, Point } from '../types/image.types'
import type { MeasureScale, MeasureState } from '../types/measure.types'
import { labelAnchor, midpoint, referenceLabel, shapeLabel } from '../utils/measure'
import { MIN_AREA_POINTS, type MeasureAction } from '../utils/measure-state'

interface MeasureCanvasProps {
  item: ImageItem
  state: MeasureState
  scale: MeasureScale | null
  disabled: boolean
  dispatch: (action: MeasureAction) => void
}

/** Điểm đang kéo: đỉnh thứ `index` của một hình, hoặc một đầu của đoạn chuẩn. */
type Grip = { kind: 'shape'; id: number; index: number } | { kind: 'reference'; index: 0 | 1 }

/** Con trỏ đi quá ngần này (điểm màn hình) thì là kéo, không phải bấm. */
const DRAG_SLOP = 4

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max)
const path = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')

/**
 * Ảnh + lớp vẽ số đo. Bấm lên ảnh để thêm điểm theo thẻ đang chọn; kéo một điểm
 * (hoặc phím mũi tên khi điểm đang được chọn) để chỉnh. Nét vẽ nằm trong SVG
 * theo toạ độ ảnh; điểm và nhãn là phần tử HTML đặt theo phần trăm, nên giữ
 * nguyên cỡ trên màn hình dù ảnh to hay nhỏ.
 */
export function MeasureCanvas({ item, state, scale, disabled, dispatch }: MeasureCanvasProps) {
  const { t } = useTranslation('image')
  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ grip: Grip; x: number; y: number; moved: boolean } | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const { shapes, draft, reference, mode } = state

  const toImage = (event: { clientX: number; clientY: number }): Point => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || box.width === 0) return { x: 0, y: 0 }
    return {
      x: clamp(((event.clientX - box.left) / box.width) * item.width, item.width),
      y: clamp(((event.clientY - box.top) / box.height) * item.height, item.height),
    }
  }

  const at = (point: Point): CSSProperties => ({ left: `${(point.x / item.width) * 100}%`, top: `${(point.y / item.height) * 100}%` })

  const move = (grip: Grip, point: Point) =>
    dispatch(grip.kind === 'reference' ? { type: 'move-reference', index: grip.index, point } : { type: 'move', id: grip.id, index: grip.index, point })

  const gripHandlers = (grip: Grip, point: Point, onTap?: () => void) => ({
    disabled,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { grip, x: event.clientX, y: event.clientY, moved: false }
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current
      if (!current) return
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_SLOP) return
      current.moved = true
      move(current.grip, toImage(event))
    },
    onPointerUp: () => {
      const tapped = drag.current && !drag.current.moved
      drag.current = null
      if (tapped) onTap?.()
    },
    onPointerCancel: () => {
      drag.current = null
    },
    // Lần bấm kết thúc trên điểm không được rơi xuống ảnh thành một điểm mới.
    onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const arrow = ARROWS[event.key]
      if (arrow) {
        event.preventDefault()
        // Một lần nhấn = một điểm trên màn hình, để bước đi nhìn thấy được ở mọi cỡ ảnh.
        const step = (item.width / (surface.current?.clientWidth || item.width)) * (event.shiftKey ? 10 : 1)
        move(grip, { x: clamp(point.x + arrow[0] * step, item.width), y: clamp(point.y + arrow[1] * step, item.height) })
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && grip.kind === 'shape') {
        event.preventDefault()
        dispatch({ type: 'remove', id: grip.id })
      }
    },
  })

  const canClose = mode === 'area' && draft.length >= MIN_AREA_POINTS
  // Đoạn nối từ điểm vừa bấm tới con trỏ: cho thấy hình sắp thành trước khi bấm điểm kế.
  const preview = hover && draft.length > 0 ? [...draft, hover] : draft
  const distances = shapes.filter((shape) => shape.kind === 'distance')
  const areas = shapes.filter((shape) => shape.kind === 'area')

  return (
    <div
      ref={surface}
      className={`erp-image-stage__frame erp-measure${disabled ? ' is-disabled' : ''}`}
      style={{ '--erp-image-ratio': item.width / item.height } as CSSProperties}
      onClick={(event) => {
        if (disabled) return
        // Bỏ vị trí con trỏ cũ: không thì điểm đầu của hình mới bị nối về chỗ con trỏ đứng từ hình trước.
        setHover(null)
        dispatch({ type: 'point', point: toImage(event) })
      }}
      onPointerMove={(event) => {
        if (event.pointerType === 'mouse' && draft.length > 0) setHover(toImage(event))
      }}
      onPointerLeave={() => setHover(null)}
    >
      <img className="erp-measure__image" src={item.url} alt={t('measure.imageAlt', { name: item.name })} draggable={false} />

      <svg className="erp-measure__lines" viewBox={`0 0 ${item.width} ${item.height}`} preserveAspectRatio="none" aria-hidden="true">
        {reference ? (
          <g className="erp-measure__line erp-measure__line--reference">
            <polyline className="erp-measure__halo" points={path(reference.points)} />
            <polyline className="erp-measure__stroke" points={path(reference.points)} />
          </g>
        ) : null}
        {shapes.map((shape) =>
          shape.kind === 'count' ? null : (
            <g key={shape.id} className="erp-measure__line">
              {shape.kind === 'area' ? <polygon className="erp-measure__fill" points={path(shape.points)} /> : null}
              {shape.kind === 'area' ? <polygon className="erp-measure__halo" points={path(shape.points)} /> : <polyline className="erp-measure__halo" points={path(shape.points)} />}
              {shape.kind === 'area' ? <polygon className="erp-measure__stroke" points={path(shape.points)} /> : <polyline className="erp-measure__stroke" points={path(shape.points)} />}
            </g>
          ),
        )}
        {preview.length > 1 ? (
          <g className={`erp-measure__line erp-measure__line--draft${mode === 'reference' ? ' erp-measure__line--reference' : ''}`}>
            <polyline className="erp-measure__halo" points={path(preview)} />
            <polyline className="erp-measure__stroke" points={path(preview)} />
          </g>
        ) : null}
      </svg>

      {reference
        ? reference.points.map((point, index) => (
            <button
              key={index}
              type="button"
              className="erp-measure__grip erp-measure__grip--reference"
              style={at(point)}
              aria-label={t('measure.referenceGrip', { index: index + 1 })}
              {...gripHandlers({ kind: 'reference', index: index as 0 | 1 }, point)}
            />
          ))
        : null}

      {shapes.map((shape) => {
        if (shape.kind === 'count') {
          const number = shapeLabel(shape, shapes, scale)
          return (
            <button
              key={shape.id}
              type="button"
              className="erp-measure__count"
              style={at(shape.points[0])}
              aria-label={t('measure.countGrip', { number })}
              {...gripHandlers({ kind: 'shape', id: shape.id, index: 0 }, shape.points[0], () => dispatch({ type: 'remove', id: shape.id }))}
            >
              {number}
            </button>
          )
        }
        const gripLabel = (point: number) =>
          shape.kind === 'distance'
            ? t('measure.distanceGrip', { point, index: distances.indexOf(shape) + 1 })
            : t('measure.areaGrip', { point, index: areas.indexOf(shape) + 1 })
        return shape.points.map((point, index) => (
          <button
            key={`${shape.id}-${index}`}
            type="button"
            className="erp-measure__grip"
            style={at(point)}
            aria-label={gripLabel(index + 1)}
            {...gripHandlers({ kind: 'shape', id: shape.id, index }, point)}
          />
        ))
      })}

      {draft.map((point, index) =>
        index === 0 && canClose ? (
          <button
            key={index}
            type="button"
            className="erp-measure__grip erp-measure__grip--close"
            style={at(point)}
            aria-label={t('measure.closeAtStart')}
            title={t('measure.closeArea')}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              dispatch({ type: 'close' })
            }}
          />
        ) : (
          <span key={index} className={`erp-measure__dot${mode === 'reference' ? ' erp-measure__dot--reference' : ''}`} style={at(point)} aria-hidden="true" />
        ),
      )}

      {reference && scale ? (
        <span className="erp-measure__label erp-measure__label--above erp-measure__label--reference" style={at(midpoint(...reference.points))}>
          {referenceLabel(reference, scale)}
        </span>
      ) : null}
      {shapes.map((shape) =>
        shape.kind === 'count' ? null : (
          <span key={shape.id} className={`erp-measure__label${shape.kind === 'distance' ? ' erp-measure__label--above' : ''}`} style={at(labelAnchor(shape))}>
            {shapeLabel(shape, shapes, scale)}
          </span>
        ),
      )}
    </div>
  )
}
