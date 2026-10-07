import { useId, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { Form } from 'react-bootstrap'
import { CopyButton, parseDecimal, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { HolidaysInRange } from '../components/HolidaysInRange'
import { NumberField } from '../components/NumberField'
import { addWorkdays, formatDay, spanBetween, toDay, todayYmd, weeksLabel } from '../utils/date-calc'
import { numberFormat } from '@/i18n/intl'

type Mode = 'between' | 'add'
type Direction = 'forward' | 'back'
type DayKind = 'calendar' | 'workday'

const MODES: { value: Mode; label: ParseKeys<'utility'>; icon: string }[] = [
  { value: 'between', label: 'dateCalc.modes.between', icon: 'calendar-range' },
  { value: 'add', label: 'dateCalc.modes.add', icon: 'calendar-plus' },
]

/** ~274 năm: quá mức này kết quả vượt năm 9999 và ô ngày của trình duyệt không hiện được. */
const MAX_COUNT = 100_000

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
  const { t } = useTranslation('utility')
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
            <p className="erp-tool-result__label">{t('dateCalc.distance')}</p>
            {span && fromDayNumber !== null && toDayNumber !== null ? (
              <>
                <p className="erp-tool-result__value">
                  <Trans t={t} i18nKey="shared.daysValue" count={Math.abs(span.days)} components={{ unit: <span className="erp-tool-result__unit" /> }} />
                </p>
                {span.days < 0 ? <p className="erp-tool-result__note">{t('dateCalc.countingBack')}</p> : null}
                {weeksLabel(span.days) ? <p className="erp-tool-result__note">{t('dateCalc.equalsWeeks', { weeks: weeksLabel(span.days) })}</p> : null}
                <CopyButton text={String(Math.abs(span.days))} label={t('dateCalc.copyDays')} className="align-self-start" />
                <ul className="erp-tool-rows mt-3">
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      <Trans t={t} i18nKey="shared.daysValue" count={Math.abs(span.workdays)} components={{ unit: <span className="erp-tool-row__unit" /> }} />
                    </span>
                    <span className="erp-tool-row__label">{t('dateCalc.workdays')}</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      <Trans t={t} i18nKey="shared.daysValue" count={Math.abs(span.weekendDays)} components={{ unit: <span className="erp-tool-row__unit" /> }} />
                    </span>
                    <span className="erp-tool-row__label">{t('dateCalc.weekendDays')}</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">{formatDay(fromDayNumber)}</span>
                    <span className="erp-tool-row__label">{includeStart ? t('dateCalc.startIncluded') : t('dateCalc.startExcluded')}</span>
                  </li>
                  <li className="erp-tool-row">
                    <span className="erp-tool-row__value">{formatDay(toDayNumber)}</span>
                    <span className="erp-tool-row__label">{t('dateCalc.endIncluded')}</span>
                  </li>
                </ul>
                <HolidaysInRange from={fromDayNumber} to={toDayNumber} />
              </>
            ) : (
              <>
                <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
                <p className="erp-tool-result__note">{t('dateCalc.pickBoth')}</p>
              </>
            )}
          </div>
        ) : (
          <div className="erp-tool-result" role="status">
            <p className="erp-tool-result__label">{t('dateCalc.landsOn')}</p>
            {landed !== null && startDay !== null && count !== null ? (
              <>
                <p className="erp-tool-result__value">{formatDay(landed)}</p>
                <p className="erp-tool-result__note">
                  {t(kind === 'calendar' ? 'dateCalc.addedCalendar' : 'dateCalc.addedWorkdays', { start: dateOnly(startDay), sign: direction === 'forward' ? '+' : '−', count })}
                </p>
                {kind === 'workday' ? <p className="erp-tool-result__note">{t('dateCalc.calendarEquivalent', { count: Math.abs(landed - startDay) })}</p> : null}
                <CopyButton text={dateOnly(landed)} label={t('dateCalc.copyDate')} className="align-self-start" />
                <HolidaysInRange from={startDay} to={landed} />
              </>
            ) : (
              <>
                <p className="erp-tool-result__value erp-tool-result__value--empty">—</p>
                <p className="erp-tool-result__note">{countWrong ? t('dateCalc.countInvalid', { max: numberFormat().format(MAX_COUNT) }) : t('dateCalc.pickStart')}</p>
              </>
            )}
          </div>
        )
      }
    >
      <ToolSegments label={t('dateCalc.modeLabel')} value={mode} options={MODES.map((item) => ({ ...item, label: t(item.label) }))} onChange={setMode} />

      {mode === 'between' ? (
        <ToolPanel title={t('dateCalc.betweenTitle')}>
          <div className="erp-tool-form">
            <div className="erp-tool-form__grid">
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-from`}>
                  {t('dateCalc.fromDate')}
                </label>
                <Form.Control id={`${ids}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-to`}>
                  {t('dateCalc.toDate')}
                </label>
                <Form.Control id={`${ids}-to`} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
            </div>
            <Form.Check
              id={`${ids}-include`}
              type="checkbox"
              label={t('dateCalc.includeStart')}
              checked={includeStart}
              onChange={(event) => setIncludeStart(event.target.checked)}
            />
            <p className="erp-flow-field__hint">{t('dateCalc.includeStartHint')}</p>
            <p className="erp-flow-field__hint">{t('dateCalc.weekendOnly')}</p>
          </div>
        </ToolPanel>
      ) : (
        <ToolPanel title={t('dateCalc.addTitle')}>
          <div className="erp-tool-form">
            <div className="erp-tool-form__grid">
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-start`}>
                  {t('dateCalc.startDate')}
                </label>
                <Form.Control id={`${ids}-start`} type="date" value={start} onChange={(event) => setStart(event.target.value)} />
              </div>
              <NumberField label={t('dateCalc.dayCount')} unit={t('shared.days')} value={countText} invalid={countWrong} onChange={setCountText} />
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-direction`}>
                  {t('dateCalc.direction')}
                </label>
                <Form.Select id={`${ids}-direction`} value={direction} onChange={(event) => setDirection(event.target.value as Direction)}>
                  <option value="forward">{t('dateCalc.forward')}</option>
                  <option value="back">{t('dateCalc.back')}</option>
                </Form.Select>
              </div>
              <div className="erp-flow-field">
                <label className="erp-flow-field__label" htmlFor={`${ids}-kind`}>
                  {t('dateCalc.dayKind')}
                </label>
                <Form.Select id={`${ids}-kind`} value={kind} onChange={(event) => setKind(event.target.value as DayKind)}>
                  <option value="calendar">{t('dateCalc.calendar')}</option>
                  <option value="workday">{t('dateCalc.workdays')}</option>
                </Form.Select>
              </div>
            </div>
            <p className="erp-flow-field__hint">{t('dateCalc.addHint')}</p>
            <p className="erp-flow-field__hint">{t('dateCalc.weekendOnly')}</p>
          </div>
        </ToolPanel>
      )}
    </ToolBoard>
  )
}
