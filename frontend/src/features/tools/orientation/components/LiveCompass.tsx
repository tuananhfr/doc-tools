import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolPanel } from '@/features/tools/hub'
import { HEADING_FAILURE, STABILITY_BADGE } from '../config/heading-status'
import { LUOPAN_CONVENTION } from '../config/luopan'
import { useDeviceHeading } from '../hooks/useDeviceHeading'
import type { VoidKind } from '../types/luopan.types'
import { directionOf, formatDeg, normalizeDeg } from '../utils/azimuth'
import { compassShapes, type StarSegment } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'
import { mountainOf, sittingOf } from '../utils/luopan'
import { ManualDegree } from './ManualDegree'
import { ShapeLayer } from './ShapeLayer'

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

const VOID_LABEL: Record<VoidKind, string> = { MAJOR: 'Đại không vong', MINOR: 'Tiểu không vong' }

/**
 * La bàn sống của chế độ Gia chủ: mặt la kinh xoay theo đầu máy như la bàn thật,
 * dây Hướng – Toạ cố định theo thân máy, khoá lại thì mặt số đứng yên. Không có
 * cảm biến (máy tính, quyền bị chặn) vẫn nhập tay được số độ — không bao giờ kẹt.
 */
export function LiveCompass({ palette, stars, locked, disabled, onLock, onUnlock }: LiveCompassProps) {
  const { status, reading, start, stop } = useDeviceHeading()
  const [outside, setOutside] = useState(false)
  const [manual, setManual] = useState(false)
  const failure = HEADING_FAILURE[status]
  const live = status === 'live' ? reading : null
  // Đứng ngoài nhìn vào nhà thì đầu máy chĩa vào TOẠ — hướng nhà ở sau lưng máy.
  const flipped = outside && !manual
  const liveFacing = live ? normalizeDeg(live.heading + (flipped ? 180 : 0)) : null
  const facing = locked?.azimuth ?? liveFacing
  const pointing = facing === null ? 0 : normalizeDeg(facing + (flipped ? 180 : 0))
  const stability = live?.stability ? STABILITY_BADGE[live.stability] : null

  const shapes = useMemo(
    () => compassShapes({ center: { x: CENTER, y: CENTER }, radius: RADIUS, north: 0, divisions: 8, degrees: false, needles: [], rings: { stars } }),
    [stars],
  )
  const [top, bottom] = flipped ? ['TOẠ', 'HƯỚNG'] : ['HƯỚNG', 'TOẠ']
  const [topColor, bottomColor] = flipped ? [palette.ring, palette.north] : [palette.north, palette.ring]

  const toggleManual = () => {
    if (manual) {
      if (locked?.source === 'MANUAL') onUnlock()
    } else stop()
    setManual(!manual)
  }

  return (
    <ToolPanel title="La bàn hướng nhà">
      {!manual && !locked ? <p className="erp-orient-muted">Đứng ở cửa chính, quay lưng vào nhà, cầm máy nằm ngang, đầu máy chĩa thẳng ra ngoài.</p> : null}

      <svg
        className="erp-orient-dial"
        viewBox={`0 ${-PAD} ${SIDE} ${SIDE + PAD * 2}`}
        role="img"
        aria-label={facing === null ? 'Mặt la bàn, Bắc ở trên' : `Mặt la bàn, hướng nhà ${formatDeg(facing)}`}
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

      {facing !== null ? <FacingReadout facing={facing} /> : <p className="erp-orient-muted erp-orient-facing__empty">Bấm “Bắt đầu đo” hoặc nhập số độ để đọc hướng nhà.</p>}

      {live ? (
        <div className="erp-orient-facing__meta">
          {stability ? (
            <span className={`erp-orient-badge erp-orient-badge--${stability.tone}`}>
              <Icon name={stability.icon} />
              {stability.label}
            </span>
          ) : null}
          <span className="erp-orient-muted">{live.accuracy !== null ? `Máy báo sai số ±${Math.round(live.accuracy)}°` : 'Máy không báo sai số'}</span>
        </div>
      ) : null}

      {failure && !manual ? (
        <p className="erp-orient-note erp-orient-note--danger" role="alert">
          <Icon name="x-octagon" />
          {failure} Có thể nhập số độ đo bằng la bàn khác.
        </p>
      ) : null}

      {manual ? (
        <ManualDegree
          label="Hướng nhà"
          value={locked?.source === 'MANUAL' ? locked.azimuth : null}
          disabled={disabled}
          onChange={(azimuth) => (azimuth === null ? onUnlock() : onLock(azimuth, 'MANUAL', null))}
        />
      ) : null}

      {!manual && !locked ? (
        <Form.Check
          type="checkbox"
          id="orient-live-outside"
          label="Tôi đang đứng ngoài, nhìn vào nhà"
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
              Đã khoá {formatDeg(locked.azimuth)}
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
              Đo lại
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
              Khoá hướng
            </Button>
            <Button variant="outline-secondary" disabled={disabled} onClick={stop}>
              Dừng
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={disabled || status === 'starting'} onClick={() => void start()}>
            <Icon name="compass" className="me-2" />
            {status === 'starting' ? 'Đang mở la bàn…' : failure ? 'Thử lại' : 'Bắt đầu đo'}
          </Button>
        )}
        <Button variant="link" className="erp-orient-actions__link" disabled={disabled} onClick={toggleManual}>
          {manual ? 'Dùng la bàn của máy' : 'Nhập số độ'}
        </Button>
      </div>

      {live?.stability === 'UNSTABLE' ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="arrow-repeat" />
          Số đang nhảy nhiều nên chưa khoá được. Đứng yên, xoay máy hình số 8 vài lần để máy tự hiệu chỉnh.
        </p>
      ) : null}
      {!manual && !locked ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="magnet" />
          Đứng xa cột thép, ô tô, cửa cuốn, nam châm và thiết bị điện — chúng làm lệch la bàn.
        </p>
      ) : null}
    </ToolPanel>
  )
}

/** Hướng / toạ đọc theo 24 sơn, độ lệch tâm sơn và cảnh báo không vong. */
function FacingReadout({ facing }: { facing: number }) {
  const sitting = sittingOf(facing)
  const front = mountainOf(facing)
  const back = mountainOf(sitting)

  return (
    <div className="erp-orient-facing" aria-live="polite">
      <dl className="erp-orient-facing__pair">
        <div>
          <dt>Hướng</dt>
          <dd>
            <strong>{front.mountain.name}</strong>
            <span>
              {formatDeg(facing)} · {directionOf(facing).name}
            </span>
          </dd>
        </div>
        <div>
          <dt>Toạ</dt>
          <dd>
            <strong>{back.mountain.name}</strong>
            <span>
              {formatDeg(sitting)} · {directionOf(sitting).name}
            </span>
          </dd>
        </div>
      </dl>
      <p className="erp-orient-muted">
        {front.toward
          ? `Lệch tâm ${front.mountain.name} ${formatDeg(Math.abs(front.offset))} về phía ${front.toward.name}.`
          : `Đúng tâm sơn ${front.mountain.name}.`}
      </p>
      {front.void && front.toward ? (
        <div className="erp-orient-note erp-orient-note--warning" role="status">
          <Icon name="exclamation-triangle" />
          <span>
            <strong>{VOID_LABEL[front.void]}</strong> — hướng nằm sát ranh {front.mountain.name} / {front.toward.name}. {LUOPAN_CONVENTION.note}
          </span>
        </div>
      ) : null}
    </div>
  )
}
