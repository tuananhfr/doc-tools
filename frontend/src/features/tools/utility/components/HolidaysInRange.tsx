import { useTranslation } from 'react-i18next'
import { HOLIDAY_RANGE_MAX_DAYS, holidaysInRange } from '@/features/tools/vietnam'
import { formatDay, fromDay, toDay } from '../utils/date-calc'

interface Props { from: number; to: number }

const SHOWN = 8

/**
 * Liệt kê ngày lễ lớn rơi vào khoảng, KHÔNG tự trừ: số ngày nghỉ, nghỉ bù do nhà nước
 * công bố từng năm và mỗi cơ quan áp khác nhau — đó là dữ liệu pháp lý, không đoán.
 */
export function HolidaysInRange({ from, to }: Props) {
  // `vietnam` chứa tên ngày lễ mà holidaysInRange đọc qua translateKey.
  const { t } = useTranslation(['utility', 'vietnam'])
  const [first, last] = from <= to ? [from, to] : [to, from]
  if (last - first > HOLIDAY_RANGE_MAX_DAYS) return <p className="erp-tool-result__note">{t('holidays.tooLong', { count: HOLIDAY_RANGE_MAX_DAYS })}</p>
  const holidays = holidaysInRange(fromDay(first), fromDay(last)).filter((holiday) => holiday.layer === 'major')
  if (!holidays.length) return <p className="erp-tool-result__note">{t('holidays.none')}</p>
  return <div className="erp-date-holidays">
    <p className="erp-date-holidays__title">{t('holidays.count', { count: holidays.length })}</p>
    <ul>
      {holidays.slice(0, SHOWN).map((holiday) => <li key={holiday.id}><span>{holiday.name}</span><small>{formatDay(toDay(holiday.date) ?? first)}</small></li>)}
      {holidays.length > SHOWN ? <li className="erp-date-holidays__more">{t('holidays.more', { count: holidays.length - SHOWN })}</li> : null}
    </ul>
    <p className="erp-date-holidays__hint">{t('holidays.hint')}</p>
  </div>
}
