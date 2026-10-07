import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { HEADING_FAILURE, STABILITY_BADGE } from '../config/heading-status'
import { useDeviceHeading } from '../hooks/useDeviceHeading'
import { directionOf, formatDeg, normalizeDeg } from '../utils/azimuth'

interface DeviceCompassPanelProps {
  targetLabel: string
  disabled: boolean
  onLock: (azimuth: number, accuracy: number | null) => void
  onManual: () => void
}

/**
 * "Đo ngay" (spec v1.1 §9): xin quyền chỉ khi bấm, hiện số trực tiếp + độ ổn định,
 * người dùng tự CHỐT số. Mọi lỗi đều có lối ra nhập tay — không bao giờ kẹt.
 */
export function DeviceCompassPanel({ targetLabel, disabled, onLock, onManual }: DeviceCompassPanelProps) {
  const { t } = useTranslation('orientation')
  const { status, reading, start, stop } = useDeviceHeading()
  const [outside, setOutside] = useState(false)
  const failureKey = HEADING_FAILURE[status]
  const failure = failureKey ? t(`heading.failure.${failureKey}`) : null
  // Đứng ngoài nhìn vào nhà thì đầu máy chĩa NGƯỢC hướng nhà.
  const heading = reading ? normalizeDeg(reading.heading + (outside ? 180 : 0)) : null
  const stability = reading?.stability ? { ...STABILITY_BADGE[reading.stability], label: t(`heading.stability.${reading.stability}`) } : null

  return (
    <div className="erp-orient-device">
      <ol className="erp-orient-device__steps">
        <li>{t('device.steps.stand')}</li>
        <li>{t('device.steps.hold')}</li>
        <li>{t('device.steps.wait')}</li>
      </ol>
      <p className="erp-orient-note erp-orient-note--warning">
        <Icon name="magnet" />
        {t('heading.magnetWarning')}
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
            <span className="erp-orient-live__meta">{t('heading.accuracy', { value: Math.round(reading.accuracy) })}</span>
          ) : (
            <span className="erp-orient-live__meta">{t('heading.noAccuracy')}</span>
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
        label={t('heading.outside')}
        checked={outside}
        disabled={disabled}
        onChange={(event) => setOutside(event.target.checked)}
      />

      <div className="erp-orient-actions">
        {status === 'live' && heading !== null ? (
          <>
            <Button variant="primary" disabled={disabled || reading?.stability === 'UNSTABLE'} onClick={() => onLock(heading, reading?.accuracy ?? null)}>
              <Icon name="pin-angle" className="me-2" />
              {t('device.lock', { target: targetLabel.toLowerCase() })}
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
        <Button variant="link" className="erp-orient-actions__link" disabled={disabled} onClick={onManual}>
          {t('device.manual')}
        </Button>
      </div>
      {reading?.stability === 'UNSTABLE' ? (
        <p className="erp-orient-note erp-orient-note--warning">
          <Icon name="arrow-repeat" />
          {t('device.unstable')}
        </p>
      ) : null}
    </div>
  )
}
