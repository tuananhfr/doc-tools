import { HOLIDAY_RANGE_MAX_DAYS, holidaysInRange } from '@/features/tools/vietnam'
import { formatDay, fromDay, toDay } from '../utils/date-calc'

interface Props { from: number; to: number }

const SHOWN = 8

/**
 * Liệt kê ngày lễ lớn rơi vào khoảng, KHÔNG tự trừ: số ngày nghỉ, nghỉ bù do nhà nước
 * công bố từng năm và mỗi cơ quan áp khác nhau — đó là dữ liệu pháp lý, không đoán.
 */
export function HolidaysInRange({ from, to }: Props) {
  const [first, last] = from <= to ? [from, to] : [to, from]
  if (last - first > HOLIDAY_RANGE_MAX_DAYS) return <p className="erp-tool-result__note">Khoảng dài hơn {HOLIDAY_RANGE_MAX_DAYS} ngày nên không liệt kê ngày lễ.</p>
  const holidays = holidaysInRange(fromDay(first), fromDay(last)).filter((holiday) => holiday.layer === 'major')
  if (!holidays.length) return <p className="erp-tool-result__note">Không có ngày lễ lớn nào trong khoảng này.</p>
  return <div className="erp-date-holidays">
    <p className="erp-date-holidays__title">Có {holidays.length} ngày lễ trong khoảng</p>
    <ul>
      {holidays.slice(0, SHOWN).map((holiday) => <li key={holiday.id}><span>{holiday.name}</span><small>{formatDay(toDay(holiday.date) ?? first)}</small></li>)}
      {holidays.length > SHOWN ? <li className="erp-date-holidays__more">và {holidays.length - SHOWN} ngày khác</li> : null}
    </ul>
    <p className="erp-date-holidays__hint">Công cụ không tự trừ ngày nghỉ. Nếu cơ quan nghỉ những ngày này, hãy tự cộng thêm vào thời hạn.</p>
  </div>
}
