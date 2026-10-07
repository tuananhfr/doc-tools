import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { Point } from '../types/orientation.types'
import type { OrientationSourceFile } from '../types/source.types'
import type { CompassPalette } from '../utils/compass-palette'
import type { CompassExtras } from '../utils/compass-view'
import type { OrientationAction, OrientationState, OrientationStep } from '../utils/orientation-state'
import { targetLabel } from '../utils/orientation-summary'
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

const TRACE_TOOLS: { tool: TraceTool; icon: string }[] = [
  { tool: 'line', icon: 'slash-lg' },
  { tool: 'polygon', icon: 'pentagon' },
  { tool: 'rect', icon: 'square' },
]

/** Vùng làm việc trên ảnh: bước "3 chạm" hoặc công cụ vẽ lại sơ đồ, hoàn tác, và chính ảnh. */
export function OrientationStage(props: OrientationStageProps) {
  const { t } = useTranslation('orientation')
  const { source, state, busy, canUndo, canRedo, dispatch, undo, redo, labelOf } = props
  const [selected, setSelected] = useState<string | null>(null)
  const tracing = state.trace.tool !== null
  const drawing = state.method === 'DRAWING'
  const activeTarget = state.targets.find((target) => target.id === state.activeId)
  const active = activeTarget ? targetLabel(activeTarget) : ''
  const hasDoor = state.targets.some((target) => target.type === 'MAIN_DOOR' && target.axis)

  const steps: { step: OrientationStep; label: string; done: boolean }[] = [
    ...(drawing ? [{ step: 'north' as const, label: t('stage.northStep'), done: state.anchor?.source === 'DRAWING' }] : []),
    { step: 'target', label: active, done: Boolean(activeTarget?.axis) },
    { step: 'door', label: t('targets.MAIN_DOOR.label'), done: hasDoor },
  ]

  const hint = tracing
    ? t(`stage.traceHints.${state.trace.tool!}`)
    : state.step === 'north' && drawing
      ? t('stage.hints.north')
      : state.step === 'door'
        ? t('stage.hints.door')
        : drawing
          ? t('stage.hints.drawing', { target: active.toLowerCase() })
          : t('stage.hints.overlay', { target: active.toLowerCase() })

  return (
    <section className="erp-image-stage erp-orient-stage" aria-label={t('stage.aria')}>
      <div className="erp-orient-bar">
        <div className="erp-orient-tabs" role="group" aria-label={t('stage.tabsAria')}>
          <button
            type="button"
            className={`btn erp-orient-tab${!tracing ? ' is-active' : ''}`}
            aria-pressed={!tracing}
            disabled={busy}
            onClick={() => dispatch({ type: 'trace-tool', tool: null })}
          >
            <Icon name="compass" />
            {t('stage.placeTab')}
          </button>
          <button
            type="button"
            className={`btn erp-orient-tab${tracing ? ' is-active' : ''}`}
            aria-pressed={tracing}
            disabled={busy}
            onClick={() => dispatch({ type: 'trace-tool', tool: tracing ? null : 'line' })}
          >
            <Icon name="pencil" />
            {t('stage.traceTab')}
          </button>
        </div>
        <div className="erp-orient-bar__actions">
          <Button variant="outline-secondary" size="sm" disabled={busy || !canUndo} onClick={undo} aria-label={t('stage.undo')} title={t('stage.undo')}>
            <Icon name="arrow-counterclockwise" />
          </Button>
          <Button variant="outline-secondary" size="sm" disabled={busy || !canRedo} onClick={redo} aria-label={t('stage.redo')} title={t('stage.redo')}>
            <Icon name="arrow-clockwise" />
          </Button>
        </div>
      </div>

      {tracing ? (
        <div className="erp-orient-bar">
          <div className="erp-orient-tabs erp-orient-tabs--sub" role="group" aria-label={t('stage.traceKindsAria')}>
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
                {t(`stage.traceTools.${item.tool}`)}
              </button>
            ))}
          </div>
          <Form.Check
            type="switch"
            id="orient-snap"
            className="erp-orient-snap"
            label={t('stage.snap')}
            checked={state.trace.snap}
            disabled={busy || state.trace.tool === 'rect'}
            onChange={(event) => dispatch({ type: 'trace-snap', snap: event.target.checked })}
          />
        </div>
      ) : (
        <ol className="erp-orient-steps" aria-label={t('stage.stepsAria')}>
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
                {item.done ? <span className="visually-hidden">{t('stage.done')}</span> : null}
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
            aria-label={t('stage.pageAria')}
            value={source.pageIndex}
            disabled={busy}
            onChange={(event) => props.onPage(Number(event.target.value))}
          >
            {Array.from({ length: source.pageCount }, (_, index) => (
              <option key={index} value={index}>
                {t('stage.pageOption', { page: index + 1, total: source.pageCount })}
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
