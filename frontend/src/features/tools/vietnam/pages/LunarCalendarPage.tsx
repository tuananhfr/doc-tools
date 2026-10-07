import { useMemo, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { HolidayLayerToggles } from '../components/HolidayLayerToggles'
import { LunarDayDetails } from '../components/LunarDayDetails'
import { MonthCalendar } from '../components/MonthCalendar'
import { useHolidayLayers } from '../hooks/useHolidayLayers'
import { formatDmy, parseYmd, todayInVietnam, toYmd } from '../utils/calendar-format'
import { lunarToSolar, solarToLunar } from '../utils/lunar-calendar'
import { buildMonthGrid, shiftMonth } from '../utils/month-grid'
import { holidaysInRange, type Holiday } from '../utils/vietnam-holidays'

const MIN_DATE = '1800-01-01'
const MAX_DATE = '2199-12-31'

export default function LunarCalendarPage() {
  const { t } = useTranslation('vietnam')
  const [today] = useState(todayInVietnam)
  const { layers, toggle } = useHolidayLayers()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }))
  const calendarRef = useRef<HTMLDivElement>(null)
  const todayLunar = solarToLunar(parseYmd(today))
  const [lunarInput, setLunarInput] = useState({ day: '15', month: '8', year: String(todayLunar?.year ?? Number(today.slice(0, 4))), leap: false })
  const [anniversary, setAnniversary] = useState({ day: '10', month: '3', leap: false })

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor])
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>()
    for (const holiday of holidaysInRange(grid[0].date, grid[grid.length - 1].date)) {
      if (layers.includes(holiday.layer)) map.set(holiday.date, [...(map.get(holiday.date) ?? []), holiday])
    }
    return map
  }, [grid, layers])

  const selectDate = (date: string) => { setSelected(date); setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) }) }
  const showOnCalendar = (date: string) => {
    selectDate(date)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    calendarRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const lunarResult = lunarToSolar({ day: Number(lunarInput.day), month: Number(lunarInput.month), year: Number(lunarInput.year), leap: lunarInput.leap })
  const anniversaries = todayLunar ? [todayLunar.year, todayLunar.year + 1].map((year) => ({ year, solar: lunarToSolar({ day: Number(anniversary.day), month: Number(anniversary.month), year, leap: anniversary.leap }) })) : []
  // Lật tháng không đổi ngày đang chọn, nên ngày đó có thể đã nằm ngoài lưới đang vẽ.
  const dayHolidays = (holidaysByDate.get(selected) ?? holidaysInRange(selected, selected).filter((holiday) => layers.includes(holiday.layer))).filter((holiday) => holiday.layer !== 'moon')

  return <ToolBoard>
    <div className="cn-cal cn-lunar">
      <div className="cn-lunar__toolbar" ref={calendarRef}>
        <HolidayLayerToggles layers={layers} onToggle={toggle} />
        <label className="cn-lunar__jump">{t('lunar.jumpTo')}<Form.Control type="date" size="sm" min={MIN_DATE} max={MAX_DATE} value={selected} onChange={(event) => { if (event.target.value) selectDate(event.target.value) }} /></label>
      </div>
      <div className="cn-cal-layout">
        <MonthCalendar year={cursor.year} month={cursor.month} today={today} selected={selected} holidays={holidaysByDate}
          onSelect={selectDate}
          onShift={(offset) => setCursor((current) => shiftMonth(current.year, current.month, offset))}
          onToday={() => selectDate(today)} />
        <div className="cn-cal-side"><LunarDayDetails date={selected} today={today} holidays={dayHolidays} /></div>
      </div>
      <div className="cn-lunar__tools">
        <ToolPanel title={t('lunar.convertTitle')}>
          <div className="erp-tool-form__grid">{(['day', 'month', 'year'] as const).map((key) => <label className="erp-flow-field__label" key={key}>{t(`lunar.fields.${key}`)}<Form.Control type="number" min={key === 'year' ? 1800 : 1} max={key === 'day' ? 30 : key === 'month' ? 12 : 2199} step="1" value={lunarInput[key]} onChange={(event) => setLunarInput((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
          <Form.Check className="mt-3" id="lunar-leap" label={t('lunar.leapMonth')} checked={lunarInput.leap} onChange={(event) => setLunarInput((current) => ({ ...current, leap: event.target.checked }))} />
          <div className="cn-lunar__result" aria-live="polite">
            {lunarResult ? <><span><Trans ns="vietnam" i18nKey="lunar.solarResult" values={{ date: formatDmy(lunarResult) }} components={{ strong: <strong /> }} /></span><Button size="sm" variant="outline-secondary" onClick={() => showOnCalendar(toYmd(lunarResult))}>{t('lunar.showOnCalendar')}</Button></>
              : <span>{t(lunarInput.leap ? 'lunar.noSuchDayLeap' : 'lunar.noSuchDay')}</span>}
          </div>
        </ToolPanel>
        <ToolPanel title={t('lunar.anniversaryTitle')}>
          <div className="erp-tool-form__grid">{(['day', 'month'] as const).map((key) => <label className="erp-flow-field__label" key={key}>{t(`lunar.anniversaryFields.${key}`)}<Form.Control type="number" min="1" max={key === 'day' ? 30 : 12} step="1" value={anniversary[key]} onChange={(event) => setAnniversary((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
          <Form.Check className="mt-3" id="anniversary-leap" label={t('lunar.leapMonth')} checked={anniversary.leap} onChange={(event) => setAnniversary((current) => ({ ...current, leap: event.target.checked }))} />
          <ul className="cn-lunar__years" aria-live="polite">{anniversaries.map(({ year, solar }) => <li key={year}>
            <span><Trans ns="vietnam" i18nKey="lunar.anniversaryYear" values={{ year, date: solar ? formatDmy(solar) : t('lunar.noSuchDayShort') }} components={{ strong: <strong /> }} /></span>
            {solar ? <Button size="sm" variant="outline-secondary" onClick={() => showOnCalendar(toYmd(solar))}>{t('lunar.showOnCalendar')}</Button> : null}
          </li>)}</ul>
        </ToolPanel>
      </div>
    </div>
  </ToolBoard>
}
