import { useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { buildMonthGrid } from '../utils/month-grid'
import type { Holiday } from '../utils/vietnam-holidays'

/** Mục riêng của công cụ gắn lên ô ngày (vd. lịch gia đình), vẽ sau ngày lễ. */
export interface CalendarMark { id: string; title: string }

interface Props {
  year: number
  month: number
  today: string
  selected: string
  holidays: Map<string, Holiday[]>
  marks?: Map<string, CalendarMark[]>
  onSelect: (date: string) => void
  onShift: (offset: number) => void
  onToday: () => void
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const CHIP_LIMIT = 2

export function MonthCalendar({ year, month, today, selected, holidays, marks, onSelect, onShift, onToday }: Props) {
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])
  return <section className="cn-cal-month" aria-label={`Lịch tháng ${month}/${year}`}>
    <header className="cn-cal-month__bar">
      <h2>Tháng {month}<span>/{year}</span></h2>
      <div className="cn-cal-month__nav">
        <button type="button" className="cn-cal-icon-button" onClick={() => onShift(-1)} aria-label="Tháng trước"><Icon name="chevron-left" /></button>
        <button type="button" className="cn-cal-today" onClick={onToday}>Hôm nay</button>
        <button type="button" className="cn-cal-icon-button" onClick={() => onShift(1)} aria-label="Tháng sau"><Icon name="chevron-right" /></button>
      </div>
    </header>
    <div className="cn-cal-grid">
      <div className="cn-cal-grid__weekdays" aria-hidden="true">{WEEKDAYS.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="cn-cal-grid__days">
        {cells.map((cell) => {
          const dayHolidays = holidays.get(cell.date) ?? []
          const dayMarks = marks?.get(cell.date) ?? []
          const named = dayHolidays.filter((holiday) => holiday.layer !== 'moon')
          const chips = [...named.map((holiday) => ({ key: holiday.id, label: holiday.short, kind: holiday.layer as string })), ...dayMarks.map((mark) => ({ key: mark.id, label: mark.title, kind: 'event' }))]
          const major = named.some((holiday) => holiday.layer === 'major')
          const moon = dayHolidays.some((holiday) => holiday.layer === 'moon')
          const lunarLabel = cell.lunarDay === 1 ? `${cell.lunarDay}/${cell.lunarMonth}${cell.lunarLeap ? 'N' : ''}` : String(cell.lunarDay)
          const describe = [`${cell.day}/${cell.date.slice(5, 7)}`, `âm lịch ${cell.lunarDay}/${cell.lunarMonth}${cell.lunarLeap ? ' nhuận' : ''}`, ...named.map((holiday) => holiday.name), dayMarks.length ? `${dayMarks.length} lịch` : ''].filter(Boolean).join(', ')
          const classes = ['cn-cal-day', cell.inMonth ? '' : 'is-outside', cell.date === today ? 'is-today' : '', cell.date === selected ? 'is-selected' : '', cell.weekday === 0 || major ? 'is-red' : ''].filter(Boolean).join(' ')
          return <button key={cell.date} type="button" className={classes} aria-pressed={cell.date === selected} aria-label={describe} onClick={() => onSelect(cell.date)}>
            <span className="cn-cal-day__solar">{cell.day}</span>
            <span className={`cn-cal-day__lunar${moon || cell.lunarDay === 1 || cell.lunarDay === 15 ? ' is-moon' : ''}`}>{lunarLabel}</span>
            {chips.length ? <span className="cn-cal-day__chips" aria-hidden="true">
              {chips.slice(0, CHIP_LIMIT).map((chip) => <span key={chip.key} className={`cn-cal-chip cn-cal-chip--${chip.kind}`}>{chip.label}</span>)}
              {chips.length > CHIP_LIMIT ? <span className="cn-cal-chip cn-cal-chip--more">+{chips.length - CHIP_LIMIT}</span> : null}
            </span> : null}
            {chips.length ? <span className="cn-cal-day__dots" aria-hidden="true">{chips.slice(0, 3).map((chip) => <i key={chip.key} className={`cn-cal-dot cn-cal-dot--${chip.kind}`} />)}</span> : null}
          </button>
        })}
      </div>
    </div>
  </section>
}
