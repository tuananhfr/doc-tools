import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { parseDecimal, ToolPanel } from '@/features/tools/hub'
import { useOneShotLocation, type LocationStatus } from '../hooks/useOneShotLocation'
import { directionOf, formatDeg } from '../utils/azimuth'
import { daySide, facesSun, type DaySide, type SolarInput, type SolarReading } from '../utils/sun-exposure'

interface SolarPanelProps {
  reading: SolarReading | null
  /** Số độ mặt tiền; null = chưa đo. */
  front: number | null
  frontLabel: string
  onChange: (input: SolarInput | null) => void
}

const LOCATION_FAILURE: Partial<Record<LocationStatus, string>> = {
  denied: 'Bạn chưa cho phép lấy vị trí. Nhập vĩ độ, kinh độ bằng tay.',
  unavailable: 'Máy không lấy được vị trí. Nhập vĩ độ, kinh độ bằng tay.',
}

const DAY_SIDE: Record<DaySide, string> = {
  MORNING: 'nhận nắng buổi sáng',
  AFTERNOON: 'nhận nắng buổi chiều (nắng gắt, nóng nhà)',
  BOTH: 'nhận nắng cả sáng lẫn chiều',
  NONE: 'ít nắng trực tiếp trong ngày',
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
export function SolarPanel({ reading, front, frontLabel, onChange }: SolarPanelProps) {
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

  const failure = LOCATION_FAILURE[location.status]
  const sunUp = reading ? reading.now.elevation > 0 : false

  return (
    <ToolPanel
      title="Nắng & mặt trời"
      actions={<Form.Check type="switch" id="orient-sun-toggle" label={open ? 'Đang bật' : 'Đang tắt'} checked={open} onChange={(event) => toggle(event.target.checked)} />}
    >
      {!open ? (
        <p className="erp-orient-muted">Xem mặt trời mọc, lặn ở hướng nào và {frontLabel.toLowerCase()} có bị nắng chiều không.</p>
      ) : (
        <>
          <div className="erp-orient-actions">
            <Button variant="outline-secondary" disabled={location.status === 'asking'} onClick={fillMyLocation}>
              <Icon name="geo-alt" className="me-2" />
              {location.status === 'asking' ? 'Đang lấy vị trí…' : 'Dùng vị trí của tôi'}
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
              <Form.Label className="erp-flow-field__label">Vĩ độ</Form.Label>
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
              <Form.Label className="erp-flow-field__label">Kinh độ</Form.Label>
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
              <Form.Label className="erp-flow-field__label">Ngày</Form.Label>
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
              <Form.Label className="erp-flow-field__label">Giờ</Form.Label>
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
                <dt>Mặt trời lúc {time}</dt>
                <dd>
                  {sunUp ? `${formatDeg(reading.now.azimuth)} · ${directionOf(reading.now.azimuth).name} · cao ${formatDeg(reading.now.elevation)}` : 'Dưới đường chân trời'}
                </dd>
              </div>
              <div>
                <dt>Mọc</dt>
                <dd>
                  {timeOf(reading.day.sunrise)}
                  {reading.day.riseAzimuth !== null ? ` · ${formatDeg(reading.day.riseAzimuth)} ${directionOf(reading.day.riseAzimuth, 16).name}` : ''}
                </dd>
              </div>
              <div>
                <dt>Lặn</dt>
                <dd>
                  {timeOf(reading.day.sunset)}
                  {reading.day.setAzimuth !== null ? ` · ${formatDeg(reading.day.setAzimuth)} ${directionOf(reading.day.setAzimuth, 16).name}` : ''}
                </dd>
              </div>
              {front !== null ? (
                <div>
                  <dt>{frontLabel}</dt>
                  <dd>
                    {DAY_SIDE[daySide(front, reading.day)]}
                    {sunUp ? (facesSun(front, reading.now) ? ' · lúc này đang đón nắng' : ' · lúc này không đón nắng') : ''}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="erp-orient-muted">Nhập vĩ độ, kinh độ (hoặc bấm “Dùng vị trí của tôi”) để tính.</p>
          )}
          <p className="erp-orient-muted">Hướng mặt trời tính theo Bắc thật; ở Việt Nam chênh với Bắc từ dưới 1°. Không tính bóng nhà bên cạnh.</p>
        </>
      )}
    </ToolPanel>
  )
}
