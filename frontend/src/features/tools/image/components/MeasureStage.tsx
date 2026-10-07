import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { ImageItem } from '../types/image.types'
import type { MeasureMode, MeasureScale, MeasureState } from '../types/measure.types'
import { sizeLabel } from '../utils/image-format'
import { MIN_AREA_POINTS, type MeasureAction } from '../utils/measure-state'
import { MeasureCanvas } from './MeasureCanvas'

interface MeasureStageProps {
  item: ImageItem
  state: MeasureState
  scale: MeasureScale | null
  disabled: boolean
  dispatch: (action: MeasureAction) => void
}

const TABS: { mode: Exclude<MeasureMode, 'reference'>; icon: string }[] = [
  { mode: 'distance', icon: 'rulers' },
  { mode: 'area', icon: 'bounding-box' },
  { mode: 'count', icon: '123' },
]

/** Vùng làm việc của "Đo kích thước ảnh": ba thẻ kiểu đo, hoàn tác / xoá hết, và ảnh để bấm lên. */
export function MeasureStage({ item, state, scale, disabled, dispatch }: MeasureStageProps) {
  const { t } = useTranslation('image')
  const empty = state.shapes.length === 0 && state.draft.length === 0

  return (
    <section className="erp-image-stage" aria-label={t('measure.stageLabel')}>
      <div className="erp-measure-bar">
        <div className="erp-measure-tabs" role="group" aria-label={t('measure.modesLabel')}>
          {TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              className={`btn erp-measure-tab${state.mode === tab.mode ? ' is-active' : ''}`}
              aria-pressed={state.mode === tab.mode}
              disabled={disabled}
              onClick={() => dispatch({ type: 'mode', mode: tab.mode })}
            >
              <Icon name={tab.icon} />
              {t(`measure.tab.${tab.mode}`)}
            </button>
          ))}
        </div>
        <div className="erp-measure-bar__actions">
          {state.mode === 'area' ? (
            <Button variant="outline-secondary" size="sm" disabled={disabled || state.draft.length < MIN_AREA_POINTS} onClick={() => dispatch({ type: 'close' })}>
              <Icon name="check2" className="me-2" />
              {t('measure.closeArea')}
            </Button>
          ) : null}
          <Button variant="outline-secondary" size="sm" disabled={disabled || empty} onClick={() => dispatch({ type: 'undo' })}>
            <Icon name="arrow-counterclockwise" className="me-2" />
            {t('measure.undo')}
          </Button>
          <Button variant="outline-secondary" size="sm" disabled={disabled || empty} onClick={() => dispatch({ type: 'clear' })}>
            <Icon name="trash3" className="me-2" />
            {t('measure.clearAll')}
          </Button>
        </div>
      </div>

      <p className={`erp-measure-hint${state.mode === 'reference' ? ' erp-measure-hint--reference' : ''}`} role="status">
        <Icon name={state.mode === 'reference' ? 'bullseye' : 'hand-index'} />
        {t(`measure.hint.${state.mode}`)}
      </p>

      <MeasureCanvas item={item} state={state} scale={scale} disabled={disabled} dispatch={dispatch} />

      <p className="erp-image-stage__caption">
        <span className="erp-image-stage__name" title={item.name}>
          {item.name}
        </span>
        <span className="erp-image-stage__meta">{sizeLabel(item)}</span>
      </p>
    </section>
  )
}
