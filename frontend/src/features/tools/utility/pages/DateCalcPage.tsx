import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { CopyButton, parseDecimal, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { addWorkdays, formatDay, spanBetween, toDay, todayYmd, weeksLabel } from '../utils/date-calc'

type Mode = 'between' | 'add'
type Direction = 'forward' | 'back'
type DayKind = 'calendar' | 'workday'

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: 'between', label: 'Giữa hai ngày', icon: 'calendar-range' },
  { value: 'add', label: 'Cộng / trừ ngày', icon: 'calendar-plus' },
]

/** ~274 năm: quá mức này kết quả vượt năm 9999 và ô ngày của trình duyệt không hiện được. */
const MAX_COUNT = 100_000

const WEEKEND_ONLY = 'Ngày làm việc ở đây chỉ loại Thứ Bảy và Chủ nhật. Công cụ KHÔNG biết ngày lễ, Tết, nghỉ bù hay lịch làm thứ Bảy của từng nơi — thời hạn có ngày lễ chen vào phải tự cộng thêm.'

/** "01/01/2027" — phần ngày của `formatDay`, để chép sang chỗ khác. */
const dateOnly = (day: number): string => formatDay(day).split(', ')[1]

function readCount(text: string): number | null {
  const value = parseDecimal(text)
  return value !== null && Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null
}

/**
 * TÍNH NGÀY & THỜI HẠN — đếm ngày giữa hai mốc, hoặc tìm ngày rơi vào sau khi
 * cộng / trừ một số ngày. Tính trên ngày lịch, không dính giờ và múi giờ.
 */
export default function DateCalcPage() {
  const ids = useId()
  const [mode, setMode] = useState<Mode>('between')
  const [from, setFrom] = useState(todayYmd)
  const [to, setTo] = useState('')
  const [includeStart, setIncludeStart] = useState(false)
  const [start, setStart] = useState(todayYmd)
  const [countText, setCountText] = useState('')
  const [direction, setDirection] = useState<Direction>('forward')
  const [kind, setKind] = useState<DayKind>('calendar')

  const fromDayNumber = toDay(from)
  const toDayNumber = toDay(to)
  const span = fromDayNumber !== null && toDayNumber !== null ? spanBetween(fromDayNumber, toDayNumber, includeStart) : null

  const startDay = toDay(start)
  const count = readCount(countText)
  const countWrong = countText.trim() !== '' && count === null
  const signed = count === null ? null : direction === 'forward' ? count : -count
  const landed = startDay === null || signed === null ? null : kind === 'calendar' ? startDay + signed : addWorkdays(startDay, signed)

  return (
    <ToolBoard
      side={
        mode === 'between' ? (
          <div className="erp-tool-result" role="status">
            <p className="erp-tool-result__label">Khoảng cách</p>
            {span && fromDayNumber !== null && toDayNumber !== null ? (
              <>
                <p className="erp-tool-result__value">
                  {Math.abs(span.days)} <span className="erp-tool-result__unit">ngày</span>
                </p>
                {span.days < 0 ? <p className="erp-tool-result__note">Ngày kết thúc đứng trước ngày bắt đầu — đang đếm ngược.</p> : null}
                {weeksLabel(span.days) ? <p className="erp-tool-result__note">= {weeksLabel(span.days)}</p> : null}
                <CopyButton text={String(Math.abs(span.days))} label="Chép số ngày" className="align-self-start" />
                <ul className="erp-tool-rows mt-3">
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      {Math.abs(span.workdays)} <span className="erp-tool-row__unit">ngày</span>
                    </span>
                    <span className="erp-tool-row__label">Ngày làm việc (Thứ Hai – Thứ Sáu)</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      {Math.abs(span.weekendDays)} <span className="erp-tool-row__unit">ngày</span>
                    </span>
                    <span className="erp-tool-row__label">Thứ Bảy, Chủ nhật</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">{formatDay(fromDayNumber)}</span>
                    <span className="erp-tool-row__label">{includeStart ? 'Ngày bắt đầu (có tính)' : 'Ngày bắt đầu (không tính)'}</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">{formatDay(toDayNumber)}</span>
                    <span className="erp-tool-row__label">Ngày kết thúc (có tính)</span>
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
                <p className="erp-tool-result__note">Chọn đủ hai ngày để tính.</p>
              </>
            )}
          </div>
        ) : (
          <div className="erp-tool-result" role="status">
            <p className="erp-tool-result__label">Rơi vào ngày</p>
            {landed !== null && startDay !== null && count !== null ? (
              <>
                <p className="erp-tool-result__value">{formatDay(landed)}</p>
                <p className="erp-tool-result__note">
                  = {dateOnly(startDay)} {direction === 'forward' ? '+' : '−'} {count} {kind === 'calendar' ? 'ngày' : 'ngày làm việc'}
                </p>
                {kind === 'workday' ? <p className="erp-tool-result__note">Tức {Math.abs(landed - startDay)} ngày lịch.</p> : null}
                <CopyButton text={dateOnly(landed)} label="Chép ngày" className="align-self-start" />
              </>
            ) : (
              <>
                <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
                <p className="erp-tool-result__note">{countWrong ? `Số ngày phải là số nguyên từ 0 đến ${MAX_COUNT.toLocaleString('vi-VN')}.` : 'Chọn ngày bắt đầu và nhập số ngày.'}</p>
              </>
            )}
          </div>
        )
      }
    >
      <ToolSegments label="Cách tính" value={mode} options={MODES} onChange={setMode} />

      {mode === 'between' ? (
        <ToolPanel title="Hai mốc ngày">
          <div className="erp-tool-form">
            <div className="erp-tool-form__grid">
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-from`}>
                  Từ ngày
                </label>
                <Form.Control id={`${ids}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-to`}>
                  Đến ngày
                </label>
                <Form.Control id={`${ids}-to`} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
            </div>
            <Form.Check
              id={`${ids}-include`}
              type="checkbox"
              label="Tính cả ngày bắt đầu"
              checked={includeStart}
              onChange={(event) => setIncludeStart(event.target.checked)}
            />
            <p className="erp-flow-field__hint">Không tính ngày bắt đầu: Thứ Hai đến Thứ Sáu là 4 ngày (cách đếm thời hạn). Có tính: 5 ngày (cách đếm số ngày làm).</p>
            <p className="erp-flow-field__hint">{WEEKEND_ONLY}</p>
          </div>
        </ToolPanel>
      ) : (
        <ToolPanel title="Mốc và số ngày">
          <div className="erp-tool-form">
            <div className="erp-tool-form__grid">
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-start`}>
                  Ngày bắt đầu
                </label>
                <Form.Control id={`${ids}-start`} type="date" value={start} onChange={(event) => setStart(event.target.value)} />
              </div>
              <NumberField label="Số ngày" unit="ngày" value={countText} invalid={countWrong} onChange={setCountText} />
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-direction`}>
                  Hướng
                </label>
                <Form.Select id={`${ids}-direction`} value={direction} onChange={(event) => setDirection(event.target.value as Direction)}>
                  <option value="forward">Cộng (về sau)</option>
                  <option value="back">Trừ (về trước)</option>
                </Form.Select>
              </div>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-kind`}>
                  Loại ngày
                </label>
                <Form.Select id={`${ids}-kind`} value={kind} onChange={(event) => setKind(event.target.value as DayKind)}>
                  <option value="calendar">Ngày lịch</option>
                  <option value="workday">Ngày làm việc (Thứ Hai – Thứ Sáu)</option>
                </Form.Select>
              </div>
            </div>
            <p className="erp-flow-field__hint">Ngày bắt đầu không được tính: cộng 1 ngày từ Thứ Sáu ra Thứ Bảy (ngày lịch) hoặc Thứ Hai (ngày làm việc).</p>
            <p className="erp-flow-field__hint">{WEEKEND_ONLY}</p>
          </div>
        </ToolPanel>
      )}
    </ToolBoard>
  )
}
