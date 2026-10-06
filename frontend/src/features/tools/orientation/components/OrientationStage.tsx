import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { Point } from '../types/orientation.types'
import type { OrientationSourceFile } from '../types/source.types'
import type { CompassPalette } from '../utils/compass-palette'
import type { CompassExtras } from '../utils/compass-view'
import type { OrientationAction, OrientationState, OrientationStep } from '../utils/orientation-state'
import type { TraceTool } from '../utils/trace'
import { OrientationCanvas } from './OrientationCanvas'
import { TraceShapeActions } from './TraceShapeActions'

interface OrientationStageProps {
  source: Extract<OrientationSourceFile, { kind: 'image' | 'pdf' }>
  state: OrientationState
  palette: CompassPalette
  extras: CompassExtras
  busy: boolean
  canUndo: boolean
  canRedo: boolean
  labelOf: (id: string) => string
  dispatch: (action: OrientationAction) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  onPlace: (point: Point) => void
  onPage: (index: number) => void
}

const TRACE_TOOLS: { tool: TraceTool; label: string; icon: string }[] = [
  { tool: 'line', label: 'Đường tường', icon: 'slash-lg' },
  { tool: 'polygon', label: 'Đa giác', icon: 'pentagon' },
  { tool: 'rect', label: 'Khung', icon: 'square' },
]

const TRACE_HINT: Record<TraceTool, string> = {
  line: 'Chạm hai điểm để vẽ một đoạn tường. Chạm vào đầu một đoạn đã vẽ để gắn nhãn mặt tiền / cửa chính.',
  polygon: 'Chạm lần lượt các góc, chạm lại điểm đầu (vòng tròn rỗng) để khép hình.',
  rect: 'Chạm hai góc đối nhau để vẽ một khung.',
}

/** Vùng làm việc trên ảnh: bước "3 chạm" hoặc công cụ vẽ lại sơ đồ, hoàn tác, và chính ảnh. */
export function OrientationStage(props: OrientationStageProps) {
  const { source, state, busy, canUndo, canRedo, dispatch, undo, redo, labelOf } = props
  const [selected, setSelected] = useState<string | null>(null)
  const tracing = state.trace.tool !== null
  const drawing = state.method === 'DRAWING'
  const active = labelOf(state.activeId)
  const hasDoor = state.targets.some((target) => target.type === 'MAIN_DOOR' && target.axis)

  const steps: { step: OrientationStep; label: string; done: boolean }[] = [
    ...(drawing ? [{ step: 'north' as const, label: 'Hướng Bắc', done: state.anchor?.source === 'DRAWING' }] : []),
    { step: 'target', label: active, done: Boolean(state.targets.find((target) => target.id === state.activeId)?.axis) },
    { step: 'door', label: 'Cửa chính', done: hasDoor },
  ]

  const hint = tracing
    ? TRACE_HINT[state.trace.tool!]
    : state.step === 'north' && drawing
      ? 'Chạm vào ký hiệu Bắc trên bản vẽ để đặt mũi tên Bắc, rồi kéo đầu mũi tên cho trùng hướng ký hiệu.'
      : state.step === 'door'
        ? 'Chạm vào cửa chính để thêm trục cửa (không bắt buộc). Kéo đầu mũi tên chĩa ra ngoài.'
        : drawing
          ? `Chạm vào chỗ cần đo để đặt trục ${active.toLowerCase()}. Kéo đầu mũi tên chĩa RA ngoài — hướng nhìn từ trong ra.`
          : `Muốn la bàn nằm trên ảnh: chạm vào chỗ cần đo và kéo đầu mũi tên chĩa ra ngoài theo đúng hướng ${active.toLowerCase()}.`

  return (
    <section className="erp-image-stage erp-orient-stage" aria-label="Ảnh đang đo hướng">
      <div className="erp-orient-bar">
        <div className="erp-orient-tabs" role="group" aria-label="Việc đang làm trên ảnh">
          <button
            type="button"
            className={`btn erp-orient-tab${!tracing ? ' is-active' : ''}`}
            aria-pressed={!tracing}
            disabled={busy}
            onClick={() => dispatch({ type: 'trace-tool', tool: null })}
          >
            <Icon name="compass" />
            Đặt hướng
          </button>
          <button
            type="button"
            className={`btn erp-orient-tab${tracing ? ' is-active' : ''}`}
            aria-pressed={tracing}
            disabled={busy}
            onClick={() => dispatch({ type: 'trace-tool', tool: tracing ? null : 'line' })}
          >
            <Icon name="pencil" />
            Vẽ lại sơ đồ
          </button>
        </div>
        <div className="erp-orient-bar__actions">
          <Button variant="outline-secondary" size="sm" disabled={busy || !canUndo} onClick={undo} aria-label="Hoàn tác" title="Hoàn tác">
            <Icon name="arrow-counterclockwise" />
          </Button>
          <Button variant="outline-secondary" size="sm" disabled={busy || !canRedo} onClick={redo} aria-label="Làm lại" title="Làm lại">
            <Icon name="arrow-clockwise" />
          </Button>
        </div>
      </div>

      {tracing ? (
        <div className="erp-orient-bar">
          <div className="erp-orient-tabs erp-orient-tabs--sub" role="group" aria-label="Kiểu nét vẽ">
            {TRACE_TOOLS.map((item) => (
              <button
                key={item.tool}
                type="button"
                className={`btn erp-orient-tab${state.trace.tool === item.tool ? ' is-active' : ''}`}
                aria-pressed={state.trace.tool === item.tool}
                disabled={busy}
                onClick={() => dispatch({ type: 'trace-tool', tool: item.tool })}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
          <Form.Check
            type="switch"
            id="orient-snap"
            className="erp-orient-snap"
            label="Bám góc 45°"
            checked={state.trace.snap}
            disabled={busy || state.trace.tool === 'rect'}
            onChange={(event) => dispatch({ type: 'trace-snap', snap: event.target.checked })}
          />
        </div>
      ) : (
        <ol className="erp-orient-steps" aria-label="Các bước trên ảnh">
          {steps.map((item, index) => (
            <li key={item.step}>
              <button
                type="button"
                className={`erp-orient-step${state.step === item.step ? ' is-current' : ''}${item.done ? ' is-done' : ''}`}
                aria-current={state.step === item.step ? 'step' : undefined}
                disabled={busy}
                onClick={() => dispatch({ type: 'step', step: item.step })}
              >
                <span className="erp-orient-step__badge" aria-hidden="true">
                  {item.done ? <Icon name="check-lg" /> : index + 1}
                </span>
                <span className="erp-orient-step__label">{item.label}</span>
                {item.done ? <span className="visually-hidden">(đã đặt)</span> : null}
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className={`erp-orient-hint${!tracing && state.step === 'north' && drawing ? ' erp-orient-hint--key' : ''}`} role="status">
        <Icon name={tracing ? 'pencil' : 'hand-index'} />
        {hint}
      </p>

      {tracing && selected ? (
        <TraceShapeActions
          shape={state.trace.shapes.find((shape) => shape.id === selected) ?? null}
          disabled={busy}
          dispatch={dispatch}
          onDone={() => setSelected(null)}
        />
      ) : null}

      <OrientationCanvas
        view={source.view}
        state={state}
        palette={props.palette}
        extras={props.extras}
        disabled={busy}
        labelOf={labelOf}
        dispatch={dispatch}
        checkpoint={props.checkpoint}
        onPlace={props.onPlace}
        selectedShape={tracing ? selected : null}
        onSelectShape={setSelected}
      />

      <div className="erp-image-stage__caption">
        <span className="erp-image-stage__name" title={source.kind === 'image' ? source.item.name : source.name}>
          {source.kind === 'image' ? source.item.name : source.name}
        </span>
        {source.kind === 'pdf' && source.pageCount > 1 ? (
          <Form.Select
            size="sm"
            className="erp-orient-page"
            aria-label="Trang PDF đang đo"
            value={source.pageIndex}
            disabled={busy}
            onChange={(event) => props.onPage(Number(event.target.value))}
          >
            {Array.from({ length: source.pageCount }, (_, index) => (
              <option key={index} value={index}>
                Trang {index + 1} / {source.pageCount}
              </option>
            ))}
          </Form.Select>
        ) : (
          <span className="erp-image-stage__meta">
            {source.view.width} × {source.view.height}
          </span>
        )}
      </div>
    </section>
  )
}
