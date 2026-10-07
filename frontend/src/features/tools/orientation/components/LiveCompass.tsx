import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { ToolPanel } from '@/features/tools/hub'
import { numberFormat } from '@/i18n/intl'
import { HEADING_FAILURE, STABILITY_BADGE } from '../config/heading-status'
import { LUOPAN_CONVENTION } from '../config/luopan'
import { useDeviceHeading } from '../hooks/useDeviceHeading'
import { directionOf, formatDeg, normalizeDeg } from '../utils/azimuth'
import { compassShapes, type StarSegment } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'
import { mountainOf, sittingOf } from '../utils/luopan'
import { mountainName } from '../utils/terms'
import { ManualDegree } from './ManualDegree'
import { ShapeLayer } from './ShapeLayer'

const VOID_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }

export interface LockedFacing {
  azimuth: number
  source: 'DEVICE' | 'MANUAL' | 'SURVEY'
}

interface LiveCompassProps {
  palette: CompassPalette
  /** Vòng sao của gia chủ thứ nhất; null = chưa nhập tuổi. */
  stars: StarSegment[] | null
  /** Hướng nhà đã khoá; null = chưa có. */
  locked: LockedFacing | null
  disabled: boolean
  onLock: (azimuth: number, source: 'DEVICE' | 'MANUAL', accuracy: number | null) => void
  onUnlock: () => void
}

const SIDE = 320
const CENTER = SIDE / 2
const RADIUS = SIDE * 0.45
/** Chỗ trên / dưới mặt số cho chữ HƯỚNG, TOẠ. */
const PAD = 30

/**
 * La bàn sống của chế độ Gia chủ: mặt la kinh xoay theo đầu máy như la bàn thật,
 * dây Hướng – Toạ cố định theo thân máy, khoá lại thì mặt số đứng yên. Không có
 * cảm biến (máy tính, quyền bị chặn) vẫn nhập tay được số độ — không bao giờ kẹt.
 */
export function LiveCompass({ palette, stars, locked, disabled, onLock, onUnlock }: LiveCompassProps) {
  const { t } = useTranslation('orientation')
  const { status, reading, start, stop } = useDeviceHeading()
  const [outside, setOutside] = useState(false)
  const [manual, setManual] = useState(false)
  const failureKey = HEADING_FAILURE[status]
  const failure = failureKey ? t(`heading.failure.${failureKey}`) : null
  const live = status === 'live' ? reading : null
  // Đứng ngoài nhìn vào nhà thì đầu máy chĩa vào TOẠ — hướng nhà ở sau lưng máy.
  const flipped = outside && !manual
  const liveFacing = live ? normalizeDeg(live.heading + (flipped ? 180 : 0)) : null
  const facing = locked?.azimuth ?? liveFacing
  const pointing = facing === null ? 0 : normalizeDeg(facing + (flipped ? 180 : 0))
  const stability = live?.stability ? { ...STABILITY_BADGE[live.stability], label: t(`heading.stability.${live.stability}`) } : null

  const shapes = useMemo(
    () => compassShapes({ center: { x: CENTER, y: CENTER }, radius: RADIUS, north: 0, divisions: 8, degrees: false, needles: [], rings: { stars } }),
    [stars],
  )
  const [top, bottom] = flipped ? [t('live.sittingEnd'), t('live.facingEnd')] : [t('live.facingEnd'), t('live.sittingEnd')]
  const [topColor, bottomColor] = flipped ? [palette.ring, palette.north] : [palette.north, palette.ring]

  const toggleManual = () => {
    if (manual) {
      if (locked?.source === 'MANUAL') onUnlock()
    } else stop()
    setManual(!manual)
  }

  return (
    <ToolPanel title={t('live.title')}>
      {!manual && !locked ? <p className="erp-orient-muted">{t('live.intro')}</p> : null}

      <svg
        className="erp-orient-dial"
        viewBox={`0 ${-PAD} ${SIDE} ${SIDE + PAD * 2}`}
        role="img"
        aria-label={facing === null ? t('live.dialAria') : t('live.dialAriaFacing', { degree: formatDeg(facing) })}
      >
        <g transform={`rotate(${-pointing} ${CENTER} ${CENTER})`}>
          <ShapeLayer shapes={shapes} palette={palette} opacity={1} />
        </g>
        <line x1={CENTER} y1={CENTER - RADIUS - 4} x2={CENTER} y2={CENTER} stroke={topColor} strokeWidth={2.5} />
        <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER + RADIUS + 4} stroke={bottomColor} strokeWidth={2.5} strokeDasharray="6 4" />
        <polygon points={`${CENTER},${CENTER - RADIUS + 2} ${CENTER - 8},${CENTER - RADIUS - 12} ${CENTER + 8},${CENTER - RADIUS - 12}`} fill={palette.north} />
        <circle cx={CENTER} cy={CENTER} r={4} fill={palette.north} />
        <text className="erp-orient-dial__end" x={CENTER} y={-PAD + 16} fill={topColor}>
          {top}
        </text>
        <text className="erp-orient-dial__end" x={CENTER} y={SIDE + PAD - 6} fill={bottomColor}>
          {bottom}
        </text>
      </svg>

      {facing !== null ? <FacingReadout facing={facing} /> : <p className="erp-orient-muted erp-orient-facing__empty">{t('live.empty')}</p>}

      {live ? (
        <div className="erp-orient-facing__meta">
          {stability ? (
            <span className={`erp-orient-badge erp-orient-badge--${stability.tone}`}>
              <Icon name={stability.icon} />
              {stability.label}
            </span>
          ) : null}
          <span className="erp-orient-muted">{live.accuracy !== null ? t('heading.accuracy', { value: Math.round(live.accuracy) }) : t('heading.noAccuracy')}</span>
        </div>
      ) : null}

      {failure && !manual ? (
        <p className="erp-orient-note erp-orient-note--danger" role="alert">
          <Icon name="x-octagon" />
          {t('live.failureManual', { failure })}
        </p>
      ) : null}

      {manual ? (
        <ManualDegree
          label={t('targets.HOUSE_FRONTAGE.label')}
          value={locked?.source === 'MANUAL' ? locked.azimuth : null}
          disabled={disabled}
          onChange={(azimuth) => (azimuth === null ? onUnlock() : onLock(azimuth, 'MANUAL', null))}
        />
      ) : null}

      {!manual && !locked ? (
        <Form.Check
          type="checkbox"
          id="orient-live-outside"
          label={t('heading.outside')}
          checked={outside}
          disabled={disabled}
          onChange={(event) => setOutside(event.target.checked)}
        />
      ) : null}

      <div className="erp-orient-actions">
        {manual ? null : locked ? (
          <>
            <span className="erp-orient-badge erp-orient-badge--success">
              <Icon name="lock" />
              {t('live.locked', { degree: formatDeg(locked.azimuth) })}
            </span>
            <Button
              variant="outline-secondary"
              disabled={disabled}
              onClick={() => {
                onUnlock()
                void start()
              }}
            >
              <Icon name="unlock" className="me-2" />
              {t('live.remeasure')}
            </Button>
          </>
        ) : live && liveFacing !== null ? (
          <>
            <Button
              variant="primary"
              disabled={disabled || live.stability === 'UNSTABLE'}
              onClick={() => {
                onLock(liveFacing, 'DEVICE', live.accuracy)
                stop()
              }}
            >
              <Icon name="lock" className="me-2" />
              {t('live.lock')}
            </Button>
            <Button variant="outline-secondary" disabled={disabled} onClick={stop}>
              {t('heading.stop')}
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={disabled || status === 'starting'} onClick={() => void start()}>
            <Icon name="compass" className="me-2" />
            {t(status === 'starting' ? 'heading.starting' : failure ? 'heading.retry' : 'heading.start')}
          </Button>
        )}
        <Button variant="link" className="erp-orient-actions__link" disabled={disabled} onClick={toggleManual}>
          {t(manual ? 'live.useDevice' : 'live.enterDegree')}
        </Button>
      </div>

      {live?.stability === 'UNSTABLE' ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="arrow-repeat" />
          {t('live.unstable')}
        </p>
      ) : null}
      {!manual && !locked ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="magnet" />
          {t('heading.magnetWarning')}
        </p>
      ) : null}
    </ToolPanel>
  )
}

/** Hướng / toạ đọc theo 24 sơn, độ lệch tâm sơn và cảnh báo không vong. */
function FacingReadout({ facing }: { facing: number }) {
  const { t } = useTranslation('orientation')
  const sitting = sittingOf(facing)
  const front = mountainOf(facing)
  const back = mountainOf(sitting)

  return (
    <div className="erp-orient-facing" aria-live="polite">
      <dl className="erp-orient-facing__pair">
        <div>
          <dt>{t('live.facing')}</dt>
          <dd>
            <strong>{mountainName(front.mountain.index)}</strong>
            <span>
              {formatDeg(facing)} · {directionOf(facing).name}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t('live.sitting')}</dt>
          <dd>
            <strong>{mountainName(back.mountain.index)}</strong>
            <span>
              {formatDeg(sitting)} · {directionOf(sitting).name}
            </span>
          </dd>
        </div>
      </dl>
      <p className="erp-orient-muted">
        {front.toward
          ? t('live.offset', { mountain: mountainName(front.mountain.index), degree: formatDeg(Math.abs(front.offset)), toward: mountainName(front.toward.index) })
          : t('live.centered', { mountain: mountainName(front.mountain.index) })}
      </p>
      {front.void && front.toward ? (
        <div className="erp-orient-note erp-orient-note--warning" role="status">
          <Icon name="exclamation-triangle" />
          <span>
            <Trans
              ns="orientation"
              i18nKey="live.voidWarning"
              values={{ kind: t(`live.void.${front.void}`), mountain: mountainName(front.mountain.index), toward: mountainName(front.toward.index), note: t('terms.voidNote', { window: numberFormat(VOID_FORMAT).format(LUOPAN_CONVENTION.voidWindow) }) }}
              components={{ strong: <strong /> }}
            />
          </span>
        </div>
      ) : null}
    </div>
  )
}
