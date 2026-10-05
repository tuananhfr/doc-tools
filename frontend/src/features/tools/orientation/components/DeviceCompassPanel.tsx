import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { useDeviceHeading, type HeadingStatus } from '../hooks/useDeviceHeading'
import { directionOf, formatDeg, normalizeDeg } from '../utils/azimuth'
import type { Stability } from '../utils/device-heading'

interface DeviceCompassPanelProps {
  targetLabel: string
  disabled: boolean
  onLock: (azimuth: number, accuracy: number | null) => void
  onManual: () => void
}

const FAILURE: Partial<Record<HeadingStatus, string>> = {
  unsupported: 'Trình duyệt này không đọc được la bàn của máy.',
  insecure: 'La bàn chỉ chạy khi mở trang bằng HTTPS.',
  denied: 'Bạn chưa cho phép đọc cảm biến hướng. Cho phép trong cài đặt trình duyệt rồi thử lại.',
  'no-signal': 'Không nhận được tín hiệu la bàn — máy tính và nhiều trình duyệt không có cảm biến này.',
}

const STABILITY: Record<Stability, { label: string; icon: string; tone: string }> = {
  STABLE: { label: 'Ổn định', icon: 'check-circle', tone: 'success' },
  WOBBLY: { label: 'Còn dao động', icon: 'exclamation-circle', tone: 'warning' },
  UNSTABLE: { label: 'Không ổn định', icon: 'exclamation-triangle', tone: 'danger' },
}

/**
 * "Đo ngay" (spec v1.1 §9): xin quyền chỉ khi bấm, hiện số trực tiếp + độ ổn định,
 * người dùng tự CHỐT số. Mọi lỗi đều có lối ra nhập tay — không bao giờ kẹt.
 */
export function DeviceCompassPanel({ targetLabel, disabled, onLock, onManual }: DeviceCompassPanelProps) {
  const { status, reading, start, stop } = useDeviceHeading()
  const [outside, setOutside] = useState(false)
  const failure = FAILURE[status]
  // Đứng ngoài nhìn vào nhà thì đầu máy chĩa NGƯỢC hướng nhà.
  const heading = reading ? normalizeDeg(reading.heading + (outside ? 180 : 0)) : null
  const stability = reading?.stability ? STABILITY[reading.stability] : null

  return (
    <div className="erp-orient-device">
      <ol className="erp-orient-device__steps">
        <li>Đứng ở cửa chính, quay lưng vào nhà, nhìn thẳng ra ngoài.</li>
        <li>Cầm điện thoại nằm ngang (song song mặt đất), đầu máy chĩa theo hướng nhìn.</li>
        <li>Đứng yên vài giây cho số ổn định rồi bấm “Chốt số đo”.</li>
      </ol>
      <p className="erp-orient-note erp-orient-note--warning">
        <Icon name="magnet" />
        Đứng xa cột thép, ô tô, cửa cuốn, nam châm và thiết bị điện — chúng làm lệch la bàn.
      </p>

      {status === 'live' && heading !== null ? (
        <div className="erp-orient-live" aria-live="polite">
          <span className="erp-orient-live__value">{formatDeg(heading)}</span>
          <span className="erp-orient-live__direction">{directionOf(heading).name}</span>
          {stability ? (
            <span className={`erp-orient-badge erp-orient-badge--${stability.tone}`}>
              <Icon name={stability.icon} />
              {stability.label}
            </span>
          ) : null}
          {reading?.accuracy !== null && reading?.accuracy !== undefined ? (
            <span className="erp-orient-live__meta">Máy báo sai số ±{Math.round(reading.accuracy)}°</span>
          ) : (
            <span className="erp-orient-live__meta">Máy không báo sai số</span>
          )}
        </div>
      ) : null}

      {failure ? (
        <p className="erp-orient-note erp-orient-note--danger" role="alert">
          <Icon name="x-octagon" />
          {failure}
        </p>
      ) : null}

      <Form.Check
        type="checkbox"
        id="orient-outside"
        label="Tôi đang đứng ngoài, nhìn vào nhà"
        checked={outside}
        disabled={disabled}
        onChange={(event) => setOutside(event.target.checked)}
      />

      <div className="erp-orient-actions">
        {status === 'live' && heading !== null ? (
          <>
            <Button variant="primary" disabled={disabled} onClick={() => onLock(heading, reading?.accuracy ?? null)}>
              <Icon name="pin-angle" className="me-2" />
              Chốt số đo cho {targetLabel.toLowerCase()}
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
        <Button variant="link" className="erp-orient-actions__link" disabled={disabled} onClick={onManual}>
          Nhập số độ thay vào
        </Button>
      </div>
      {reading?.stability === 'UNSTABLE' ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="arrow-repeat" />
          Số đang nhảy nhiều. Đứng yên, xoay máy hình số 8 vài lần để máy tự hiệu chỉnh, rồi đo lại.
        </p>
      ) : null}
    </div>
  )
}
