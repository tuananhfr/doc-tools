import { canChi, lunarToSolar, solarToLunar } from '../utils/lunar-calendar'
import { dayGoodHours, daySpirit } from '../utils/hoang-dao'
import { daysBetween, formatDmy, formatWeekdayDate, parseYmd } from '../utils/calendar-format'
import { HOLIDAY_LAYERS, type Holiday } from '../utils/vietnam-holidays'

interface Props { date: string; today: string; holidays: Holiday[] }

const layerLabel = (holiday: Holiday) => HOLIDAY_LAYERS.find((layer) => layer.id === holiday.layer)?.label ?? ''

export function LunarDayDetails({ date, today, holidays }: Props) {
  const lunar = solarToLunar(parseYmd(date))
  const todayLunar = solarToLunar(parseYmd(today))
  if (!lunar || !todayLunar) return <section className="cn-cal-panel"><p role="alert">Ngày nằm ngoài khoảng 1800–2199 mà thuật toán hỗ trợ.</p></section>
  const names = canChi(lunar)
  const spirit = daySpirit(lunar.month, lunar.julianDay)
  const nextTet = lunarToSolar({ day: 1, month: 1, year: todayLunar.year + 1 })
  const nextTetLunar = nextTet ? solarToLunar(nextTet) : null
  return <section className="cn-cal-panel cn-lunar-day" aria-live="polite">
    <header className="cn-cal-panel__head">
      <h3>{formatWeekdayDate(date)}</h3>
      <p>Dương lịch</p>
    </header>
    <div className="cn-lunar-day__lunar">
      <strong>{lunar.day}</strong>
      <span>Tháng {lunar.month}{lunar.leap ? ' nhuận' : ''} năm {names.year}<small>Âm lịch {lunar.day}/{lunar.month}{lunar.leap ? ' nhuận' : ''}/{lunar.year}</small></span>
    </div>
    <dl className="cn-lunar-day__facts">
      <div><dt>Ngày</dt><dd>{names.day}</dd></div>
      <div><dt>Tháng</dt><dd>{names.month}</dd></div>
      <div><dt>Năm</dt><dd>{names.year}</dd></div>
    </dl>
    <p className={`cn-lunar-day__spirit${spirit.good ? ' is-good' : ''}`}>
      <strong>{spirit.good ? 'Ngày hoàng đạo' : 'Ngày hắc đạo'}</strong> · {spirit.name}
    </p>
    {holidays.length ? <ul className="cn-cal-holidays">
      {holidays.map((holiday) => <li key={holiday.id} className={`cn-cal-holiday cn-cal-holiday--${holiday.layer}`}>
        <span className="cn-cal-swatch" aria-hidden="true" />
        <span className="cn-cal-holiday__text"><strong>{holiday.name}</strong><small>{layerLabel(holiday)} · {holiday.lunar ? 'theo âm lịch' : 'theo dương lịch'}</small></span>
      </li>)}
    </ul> : null}
    <h4 className="cn-lunar-day__label">Giờ hoàng đạo</h4>
    <ul className="cn-lunar-day__hours">
      {dayGoodHours(lunar.julianDay).map((hour) => <li key={hour.branch}><strong>{hour.branch}</strong>{hour.from}–{hour.to}</li>)}
    </ul>
    {nextTet && nextTetLunar ? <p className="cn-lunar-day__tet">Tết {canChi(nextTetLunar).year}: <strong>{formatDmy(nextTet)}</strong> · còn {daysBetween(parseYmd(today), nextTet)} ngày</p> : null}
    <p className="cn-lunar-day__note">Thuật toán thiên văn cho múi giờ Việt Nam UTC+7, phù hợp tham khảo sinh hoạt; đối chiếu lịch được cơ quan có thẩm quyền công bố khi dùng cho việc chính thức. Hoàng đạo / hắc đạo tính theo phép dân gian, chỉ để tham khảo. <a href="https://xemamlich.uhm.vn/vncal.html" target="_blank" rel="noopener noreferrer">Nguồn thuật toán Hồ Ngọc Đức</a></p>
  </section>
}
