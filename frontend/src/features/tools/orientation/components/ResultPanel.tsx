import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { directionOf, formatDeg } from '../utils/azimuth'
import { compassShapes } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'
import { standaloneCompass, type CompassExtras } from '../utils/compass-view'
import type { OrientationState } from '../utils/orientation-state'
import { measurements, provenance, targetLabel } from '../utils/orientation-summary'
import { ShapeLayer } from './ShapeLayer'

interface ResultPanelProps {
  state: OrientationState
  palette: CompassPalette
  /** Vì sao chưa có số (null = đã có). */
  missing: string | null
  /** La bàn đứng riêng khi chưa đặt được lên ảnh. */
  showCompass: boolean
  extras: CompassExtras
}

const SIDE = 280

/** KẾT QUẢ ĐO (spec v1.1 §15): số độ + hướng + nguồn, tách hẳn khỏi phần theo tuổi. */
export function ResultPanel({ state, palette, missing, showCompass, extras }: ResultPanelProps) {
  const { t } = useTranslation('orientation')
  const [main, ...others] = measurements(state)
  const origin = provenance(state)

  return (
    <section className="erp-orient-result" aria-labelledby="orient-result-title">
      <h2 id="orient-result-title" className="erp-orient-section-title">
        {t('result.title')}
      </h2>

      {main && main.azimuth !== null ? (
        <div className="erp-orient-result__main" aria-live="polite">
          <span className="erp-orient-result__target">{targetLabel(main.target)}</span>
          <span className="erp-orient-result__value">{formatDeg(main.azimuth)}</span>
          <span className="erp-orient-result__direction">{main.direction?.name}</span>
          {state.divisions === 8 && state.mode === 'PROFESSIONAL' ? (
            <span className="erp-orient-result__fine">{t('result.fine', { direction: directionOf(main.azimuth, 16).name })}</span>
          ) : null}
        </div>
      ) : (
        <p className="erp-orient-result__empty">
          <Icon name="compass" />
          {missing ?? t('result.empty')}
        </p>
      )}

      {others.some((item) => item.azimuth !== null) ? (
        <ul className="erp-orient-result__others">
          {others
            .filter((item) => item.azimuth !== null)
            .map((item) => (
              <li key={item.target.id}>
                <span>{targetLabel(item.target)}</span>
                <span className="erp-orient-result__num">
                  {formatDeg(item.azimuth ?? 0)} · {item.direction?.name}
                </span>
              </li>
            ))}
        </ul>
      ) : null}

      {origin ? <p className="erp-orient-result__origin">{origin}</p> : null}

      {showCompass ? (
        <svg className="erp-orient-result__compass" viewBox={`${-SIDE * 0.04} ${-SIDE * 0.04} ${SIDE * 1.08} ${SIDE * 1.08}`} role="img" aria-label={t('result.compassAria')}>
          <ShapeLayer shapes={compassShapes(standaloneCompass(state, SIDE, extras))} palette={palette} opacity={1} />
        </svg>
      ) : null}
    </section>
  )
}
