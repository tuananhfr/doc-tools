import { Trans, useTranslation } from 'react-i18next'
import { canChi, lunarToSolar, solarToLunar } from '../utils/lunar-calendar'
import { dayGoodHours, daySpirit } from '../utils/hoang-dao'
import { daysBetween, formatDmy, formatWeekdayDate, parseYmd } from '../utils/calendar-format'
import type { Holiday } from '../utils/vietnam-holidays'

interface Props { date: string; today: string; holidays: Holiday[] }

export function LunarDayDetails({ date, today, holidays }: Props) {
  const { t } = useTranslation('vietnam')
  const lunar = solarToLunar(parseYmd(date))
  const todayLunar = solarToLunar(parseYmd(today))
  if (!lunar || !todayLunar) return <section className="cn-cal-panel"><p role="alert">{t('day.outOfRange')}</p></section>
  const names = canChi(lunar)
  const spirit = daySpirit(lunar.month, lunar.julianDay)
  const nextTet = lunarToSolar({ day: 1, month: 1, year: todayLunar.year + 1 })
  const nextTetLunar = nextTet ? solarToLunar(nextTet) : null
  return <section className="cn-cal-panel cn-lunar-day" aria-live="polite">
    <header className="cn-cal-panel__head">
      <h3>{formatWeekdayDate(date)}</h3>
      <p>{t('day.solar')}</p>
    </header>
    <div className="cn-lunar-day__lunar">
      <strong>{lunar.day}</strong>
      <span>{t(lunar.leap ? 'day.lunarMonthYearLeap' : 'day.lunarMonthYear', { month: lunar.month, year: names.year })}<small>{t(lunar.leap ? 'day.lunarDateLeap' : 'day.lunarDate', { day: lunar.day, month: lunar.month, year: lunar.year })}</small></span>
    </div>
    <dl className="cn-lunar-day__facts">
      <div><dt>{t('day.facts.day')}</dt><dd>{names.day}</dd></div>
      <div><dt>{t('day.facts.month')}</dt><dd>{names.month}</dd></div>
      <div><dt>{t('day.facts.year')}</dt><dd>{names.year}</dd></div>
    </dl>
    <p className={`cn-lunar-day__spirit${spirit.good ? ' is-good' : ''}`}>
      <strong>{t(spirit.good ? 'day.goodDay' : 'day.badDay')}</strong> · {spirit.name}
    </p>
    {holidays.length ? <ul className="cn-cal-holidays">
      {holidays.map((holiday) => <li key={holiday.id} className={`cn-cal-holiday cn-cal-holiday--${holiday.layer}`}>
        <span className="cn-cal-swatch" aria-hidden="true" />
        <span className="cn-cal-holiday__text"><strong>{holiday.name}</strong><small>{t(`holidayLayers.${holiday.layer}`)} · {t(holiday.lunar ? 'day.byLunar' : 'day.bySolar')}</small></span>
      </li>)}
    </ul> : null}
    <h4 className="cn-lunar-day__label">{t('day.goodHours')}</h4>
    <ul className="cn-lunar-day__hours">
      {dayGoodHours(lunar.julianDay).map((hour) => <li key={hour.branch}><strong>{hour.branch}</strong>{hour.from}–{hour.to}</li>)}
    </ul>
    {nextTet && nextTetLunar ? <p className="cn-lunar-day__tet"><Trans ns="vietnam" i18nKey="day.nextTet" count={daysBetween(parseYmd(today), nextTet)} values={{ year: canChi(nextTetLunar).year, date: formatDmy(nextTet) }} components={{ strong: <strong /> }} /></p> : null}
    <p className="cn-lunar-day__note"><Trans ns="vietnam" i18nKey="day.note" components={{ link: <a href="https://xemamlich.uhm.vn/vncal.html" target="_blank" rel="noopener noreferrer" /> }} /></p>
  </section>
}
