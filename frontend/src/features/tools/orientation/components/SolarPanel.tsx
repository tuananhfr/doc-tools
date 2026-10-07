import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { parseDecimal, ToolPanel } from '@/features/tools/hub'
import { useOneShotLocation, type LocationStatus } from '../hooks/useOneShotLocation'
import { directionOf, formatDeg } from '../utils/azimuth'
import { daySide, facesSun, type SolarInput, type SolarReading } from '../utils/sun-exposure'

interface SolarPanelProps {
  reading: SolarReading | null
  /** Số độ mặt tiền; null = chưa đo. */
  front: number | null
  frontLabel: string
  /** Có = không tính được (vd. đang theo Bắc dự án); trang đã không truyền `reading`. */
  warning?: string | null
  onChange: (input: SolarInput | null) => void
}

const LOCATION_FAILURE: Partial<Record<LocationStatus, 'denied' | 'unavailable'>> = {
  denied: 'denied',
  unavailable: 'unavailable',
}

const pad = (value: number) => String(value).padStart(2, '0')
const today = (now: Date) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
const clock = (now: Date) => `${pad(now.getHours())}:${pad(now.getMinutes())}`
const timeOf = (date: Date | null) => (date ? clock(date) : '—')
const coordinate = (value: number) => String(Math.round(value * 10_000) / 10_000).replace('.', ',')

/**
 * NẮNG & MẶT TRỜI (P1) — tính tại máy theo vĩ độ / kinh độ; vị trí chỉ hỏi khi
 * bấm và không lưu. Giờ hiện theo múi giờ của máy đang xem.
 */
export function SolarPanel({ reading, front, frontLabel, warning, onChange }: SolarPanelProps) {
  const { t } = useTranslation('orientation')
  const location = useOneShotLocation()
  const [open, setOpen] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [date, setDate] = useState(() => today(new Date()))
  const [time, setTime] = useState(() => clock(new Date()))

  const publish = (next: { latitude?: string; longitude?: string; date?: string; time?: string }) => {
    const lat = parseDecimal(next.latitude ?? latitude)
    const lon = parseDecimal(next.longitude ?? longitude)
    onChange(lat === null || lon === null ? null : { latitude: lat, longitude: lon, date: next.date ?? date, time: next.time ?? time })
  }

  const toggle = (on: boolean) => {
    setOpen(on)
    if (on) publish({})
    else onChange(null)
  }

  const fillMyLocation = () =>
    location.ask((found) => {
      const next = { latitude: coordinate(found.latitude), longitude: coordinate(found.longitude) }
      setLatitude(next.latitude)
      setLongitude(next.longitude)
      publish(next)
    })

  const failureKey = LOCATION_FAILURE[location.status]
  const failure = failureKey ? t(`solar.locationFailure.${failureKey}`) : null
  const sunUp = reading ? reading.now.elevation > 0 : false

  return (
    <ToolPanel
      title={t('solar.title')}
      actions={<Form.Check type="switch" id="orient-sun-toggle" label={t(open ? 'shared.on' : 'shared.off')} checked={open} onChange={(event) => toggle(event.target.checked)} />}
    >
      {!open ? (
        <p className="erp-orient-muted">{t('solar.intro', { target: frontLabel.toLowerCase() })}</p>
      ) : (
        <>
          {warning ? (
            <p className="erp-orient-note erp-orient-note--warning" role="status">
              <Icon name="exclamation-triangle" />
              {warning}
            </p>
          ) : null}
          <div className="erp-orient-actions">
            <Button variant="outline-secondary" disabled={location.status === 'asking'} onClick={fillMyLocation}>
              <Icon name="geo-alt" className="me-2" />
              {t(location.status === 'asking' ? 'solar.locating' : 'solar.useLocation')}
            </Button>
          </div>
          {failure ? (
            <p className="erp-orient-note erp-orient-note--warning" role="alert">
              <Icon name="exclamation-triangle" />
              {failure}
            </p>
          ) : null}

          <div className="erp-orient-grid">
            <Form.Group controlId="orient-lat" className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('solar.latitude')}</Form.Label>
              <Form.Control
                inputMode="decimal"
                placeholder="21,0285"
                value={latitude}
                onChange={(event) => {
                  setLatitude(event.target.value)
                  publish({ latitude: event.target.value })
                }}
              />
            </Form.Group>
            <Form.Group controlId="orient-lon" className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('solar.longitude')}</Form.Label>
              <Form.Control
                inputMode="decimal"
                placeholder="105,8542"
                value={longitude}
                onChange={(event) => {
                  setLongitude(event.target.value)
                  publish({ longitude: event.target.value })
                }}
              />
            </Form.Group>
            <Form.Group controlId="orient-date" className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('solar.date')}</Form.Label>
              <Form.Control
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  publish({ date: event.target.value })
                }}
              />
            </Form.Group>
            <Form.Group controlId="orient-time" className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">{t('solar.time')}</Form.Label>
              <Form.Control
                type="time"
                value={time}
                onChange={(event) => {
                  setTime(event.target.value)
                  publish({ time: event.target.value })
                }}
              />
            </Form.Group>
          </div>

          {reading ? (
            <dl className="erp-orient-facts">
              <div>
                <dt>{t('solar.sunAt', { time })}</dt>
                <dd>
                  {sunUp
                    ? t('solar.sunPosition', {
                        degree: formatDeg(reading.now.azimuth),
                        direction: directionOf(reading.now.azimuth).name,
                        elevation: formatDeg(reading.now.elevation),
                      })
                    : t('solar.belowHorizon')}
                </dd>
              </div>
              <div>
                <dt>{t('solar.sunrise')}</dt>
                <dd>
                  {timeOf(reading.day.sunrise)}
                  {reading.day.riseAzimuth !== null ? ` · ${formatDeg(reading.day.riseAzimuth)} ${directionOf(reading.day.riseAzimuth, 16).name}` : ''}
                </dd>
              </div>
              <div>
                <dt>{t('solar.sunset')}</dt>
                <dd>
                  {timeOf(reading.day.sunset)}
                  {reading.day.setAzimuth !== null ? ` · ${formatDeg(reading.day.setAzimuth)} ${directionOf(reading.day.setAzimuth, 16).name}` : ''}
                </dd>
              </div>
              {front !== null ? (
                <div>
                  <dt>{frontLabel}</dt>
                  <dd>
                    {sunUp
                      ? t(facesSun(front, reading.now) ? 'solar.facingSun' : 'solar.awayFromSun', { side: t(`solar.daySide.${daySide(front, reading)}`) })
                      : t(`solar.daySide.${daySide(front, reading)}`)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="erp-orient-muted">{t('solar.needCoordinates')}</p>
          )}
          <p className="erp-orient-muted">{t('solar.note')}</p>
        </>
      )}
    </ToolPanel>
  )
}
