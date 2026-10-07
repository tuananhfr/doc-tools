import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Axis, Point } from '../types/orientation.types'
import type { SourceView } from '../types/source.types'
import { compassShapes } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'
import { overlayCompass, type CompassExtras } from '../utils/compass-view'
import type { OrientationAction, OrientationState } from '../utils/orientation-state'
import { targetLabel } from '../utils/orientation-summary'
import { sceneShapes } from '../utils/scene-geometry'
import { MIN_POLYGON_POINTS, snapPoint } from '../utils/trace'
import { ShapeLayer } from './ShapeLayer'

interface OrientationCanvasProps {
  view: SourceView
  state: OrientationState
  palette: CompassPalette
  extras: CompassExtras
  disabled: boolean
  labelOf: (id: string) => string
  dispatch: (action: OrientationAction) => void
  /** Gọi lúc bắt đầu kéo: cả lần kéo là MỘT bước hoàn tác. */
  checkpoint: () => void
  /** Chạm lên ảnh khi không vẽ: trang quyết định chạm đó đặt Bắc, trục hay cửa. */
  onPlace: (point: Point) => void
  /** Nét vẽ đang chọn (để gắn nhãn / xoá); chạm một đỉnh mà không kéo là chọn nét đó. */
  selectedShape: string | null
  onSelectShape: (id: string | null) => void
}

type Grip =
  | { kind: 'north'; end: 'from' | 'to' }
  | { kind: 'axis'; id: string; end: 'from' | 'to' }
  | { kind: 'compass'; part: 'center' | 'edge' }
  | { kind: 'trace'; id: string; index: number }

/** Con trỏ đi quá ngần này (điểm màn hình) thì là kéo, không phải bấm. */
const DRAG_SLOP = 4
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const shift = (axis: Axis, dx: number, dy: number): Axis => ({ from: { x: axis.from.x + dx, y: axis.from.y + dy }, to: { x: axis.to.x + dx, y: axis.to.y + dy } })

/**
 * Ảnh / trang PDF + mọi thứ vẽ đè: la bàn, mũi tên Bắc, trục từng đối tượng, nét
 * vẽ tay. Nét vẽ là SVG theo toạ độ ảnh (cùng danh sách hình với ảnh xuất); núm
 * kéo là nút HTML đặt theo phần trăm nên giữ cỡ 44px trên màn hình dù ảnh to nhỏ.
 * Kéo đuôi mũi tên = dời cả mũi tên; kéo đầu = xoay / đổi dài.
 */
export function OrientationCanvas({ view, state, palette, extras, disabled, labelOf, dispatch, checkpoint, onPlace, selectedShape, onSelectShape }: OrientationCanvasProps) {
  const { t } = useTranslation('orientation')
  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ grip: Grip; x: number; y: number; start: Point; moved: boolean } | null>(null)
  const [hover, setHover] = useState<Point | null>(null)
  const { trace } = state

  const toImage = (event: { clientX: number; clientY: number }): Point => {
    const box = surface.current?.getBoundingClientRect()
    if (!box || box.width === 0) return { x: 0, y: 0 }
    return {
      x: clamp(((event.clientX - box.left) / box.width) * view.width, 0, view.width),
      y: clamp(((event.clientY - box.top) / box.height) * view.height, 0, view.height),
    }
  }
  const at = (point: Point): CSSProperties => ({ left: `${(point.x / view.width) * 100}%`, top: `${(point.y / view.height) * 100}%` })

  const short = Math.min(view.width, view.height)
  const compassSpec = overlayCompass(state, view, extras)

  /** Đưa núm tới `point`; `from` = chỗ con trỏ lúc bắt đầu kéo (để dời cả mũi tên theo độ dời). */
  const moveGrip = (grip: Grip, point: Point, from: Point) => {
    if (grip.kind === 'north' && state.anchor?.source === 'DRAWING') {
      const axis = state.anchor.northAxis
      dispatch({ type: 'set-north', axis: grip.end === 'to' ? { ...axis, to: point } : shift(axis, point.x - from.x, point.y - from.y), transient: true })
    } else if (grip.kind === 'axis') {
      const axis = state.targets.find((target) => target.id === grip.id)?.axis
      if (axis) dispatch({ type: 'set-axis', id: grip.id, axis: grip.end === 'to' ? { ...axis, to: point } : shift(axis, point.x - from.x, point.y - from.y), transient: true })
    } else if (grip.kind === 'compass' && state.compass) {
      if (grip.part === 'center') {
        // La bàn không được trôi hẳn ra ngoài ảnh — luôn còn thấy tâm để kéo lại.
        dispatch({ type: 'compass', patch: { center: { x: clamp(point.x, 0, view.width), y: clamp(point.y, 0, view.height) } }, transient: true })
      } else {
        const distance = Math.hypot(point.x - state.compass.center.x, point.y - state.compass.center.y)
        dispatch({ type: 'compass', patch: { radius: clamp(distance / short, 0.08, 0.5) }, transient: true })
      }
    } else if (grip.kind === 'trace') {
      dispatch({ type: 'trace-move', id: grip.id, index: grip.index, point, transient: true })
    }
  }

  const gripPoint = (grip: Grip): Point | null => {
    if (grip.kind === 'north') return state.anchor?.source === 'DRAWING' ? state.anchor.northAxis[grip.end] : null
    if (grip.kind === 'axis') return state.targets.find((target) => target.id === grip.id)?.axis?.[grip.end] ?? null
    if (grip.kind === 'compass') {
      if (!state.compass) return null
      const { center, radius } = state.compass
      return grip.part === 'center' ? center : { x: center.x + radius * short, y: center.y }
    }
    return trace.shapes.find((shape) => shape.id === grip.id)?.points[grip.index] ?? null
  }

  const handlers = (grip: Grip, onTap?: () => void) => ({
    disabled,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { grip, x: event.clientX, y: event.clientY, start: toImage(event), moved: false }
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current
      if (!current) return
      if (!current.moved) {
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_SLOP) return
        current.moved = true
        checkpoint()
      }
      const point = toImage(event)
      moveGrip(current.grip, point, current.start)
      current.start = point
    },
    onPointerUp: () => {
      const tapped = drag.current && !drag.current.moved
      drag.current = null
      if (tapped) onTap?.()
    },
    onPointerCancel: () => {
      drag.current = null
    },
    onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const arrow = ARROWS[event.key]
      const point = gripPoint(grip)
      if (!arrow || !point) return
      event.preventDefault()
      // Một lần nhấn = một điểm màn hình (Shift = 10), nhìn thấy được bước đi ở mọi cỡ ảnh.
      const step = (view.width / (surface.current?.clientWidth || view.width)) * (event.shiftKey ? 10 : 1)
      checkpoint()
      const next = { x: clamp(point.x + arrow[0] * step, 0, view.width), y: clamp(point.y + arrow[1] * step, 0, view.height) }
      moveGrip(grip, next, point)
    },
  })

  const placing = trace.tool !== null
  const canClose = trace.tool === 'polygon' && trace.draft.length >= MIN_POLYGON_POINTS
  const preview = hover && trace.draft.length > 0 ? [...trace.draft, hover] : trace.draft
  const scene = sceneShapes({ ...state, trace: { ...trace, draft: preview } }, view, labelOf)

  const handleTap = (point: Point) => {
    if (!placing) {
      onPlace(point)
      return
    }
    const last = trace.draft[trace.draft.length - 1]
    const snapped = trace.snap && last && trace.tool !== 'rect' ? snapPoint(last, point) : point
    dispatch({ type: 'trace-point', point: snapped })
  }

  return (
    <div
      ref={surface}
      className={`erp-image-stage__frame erp-orient${disabled ? ' is-disabled' : ''}${placing ? ' is-tracing' : ''}`}
      style={{ '--erp-image-ratio': view.width / view.height } as CSSProperties}
      onClick={(event) => {
        if (disabled) return
        setHover(null)
        handleTap(toImage(event))
      }}
      onPointerMove={(event) => {
        if (event.pointerType === 'mouse' && placing && trace.draft.length > 0) setHover(toImage(event))
      }}
      onPointerLeave={() => setHover(null)}
    >
      <img className="erp-orient__image" src={view.url} alt={t('canvas.imageAlt')} draggable={false} />

      <svg className="erp-orient__layer" viewBox={`0 0 ${view.width} ${view.height}`} preserveAspectRatio="none" aria-hidden="true">
        <ShapeLayer shapes={scene} palette={palette} opacity={1} />
        {compassSpec ? <ShapeLayer shapes={compassShapes(compassSpec)} palette={palette} opacity={state.compass?.opacity ?? 1} /> : null}
      </svg>

      {trace.shapes.map((shape) =>
        shape.points.map((point, index) => (
          <button
            key={`${shape.id}-${index}`}
            type="button"
            className={`erp-orient__grip erp-orient__grip--trace${shape.id === selectedShape ? ' is-selected' : ''}`}
            style={at(point)}
            aria-label={t('canvas.traceGrip', { index: index + 1 })}
            aria-pressed={shape.id === selectedShape}
            {...handlers({ kind: 'trace', id: shape.id, index }, () => onSelectShape(shape.id === selectedShape ? null : shape.id))}
          />
        )),
      )}

      {trace.draft.map((point, index) =>
        index === 0 && canClose ? (
          <button
            key="close"
            type="button"
            className="erp-orient__grip erp-orient__grip--close"
            style={at(point)}
            aria-label={t('canvas.closeAria')}
            title={t('canvas.closeTitle')}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              dispatch({ type: 'trace-close' })
            }}
          />
        ) : (
          <span key={index} className="erp-orient__dot" style={at(point)} aria-hidden="true" />
        ),
      )}

      {!placing && state.anchor?.source === 'DRAWING'
        ? (['from', 'to'] as const).map((end) => (
            <button
              key={`north-${end}`}
              type="button"
              className={`erp-orient__grip erp-orient__grip--north${end === 'to' ? ' is-head' : ''}`}
              style={at(state.anchor?.source === 'DRAWING' ? state.anchor.northAxis[end] : { x: 0, y: 0 })}
              aria-label={t(end === 'to' ? 'canvas.northHead' : 'canvas.northTail')}
              {...handlers({ kind: 'north', end })}
            />
          ))
        : null}

      {!placing
        ? state.targets.map((target) =>
            target.axis
              ? (['from', 'to'] as const).map((end) => (
                  <button
                    key={`${target.id}-${end}`}
                    type="button"
                    className={`erp-orient__grip erp-orient__grip--axis${end === 'to' ? ' is-head' : ''}${target.id === state.activeId ? ' is-active' : ''}`}
                    style={at(target.axis![end])}
                    aria-label={t(end === 'to' ? 'canvas.axisHead' : 'canvas.axisTail', { target: targetLabel(target) })}
                    {...handlers({ kind: 'axis', id: target.id, end }, () => dispatch({ type: 'activate', id: target.id }))}
                  />
                ))
              : null,
          )
        : null}

      {!placing && compassSpec && state.compass ? (
        <>
          <button
            type="button"
            className="erp-orient__grip erp-orient__grip--compass"
            style={at(state.compass.center)}
            aria-label={t('canvas.compassCenter')}
            {...handlers({ kind: 'compass', part: 'center' })}
          />
          <button
            type="button"
            className="erp-orient__grip erp-orient__grip--size"
            style={at({ x: Math.min(state.compass.center.x + compassSpec.radius, view.width), y: state.compass.center.y })}
            aria-label={t('canvas.compassEdge')}
            {...handlers({ kind: 'compass', part: 'edge' })}
          />
        </>
      ) : null}
    </div>
  )
}
