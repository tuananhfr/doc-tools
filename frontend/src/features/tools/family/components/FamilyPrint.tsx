import { useTranslation } from 'react-i18next'
import { dateTimeFormat } from '@/i18n/intl'
import { dateOffset, eventsForDate, type FamilySpace } from '../core/family'

interface Props { space: FamilySpace; today: string; viewerId: string; includeSensitive: boolean }

// Ngày lưu dạng 'Y-m-d' theo lịch địa phương: dựng Date theo giờ máy, không qua UTC kẻo lùi một hôm.
function formatDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return dateTimeFormat({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}

export function FamilyPrint({ space, today, viewerId, includeSensitive }: Props) {
  const { t } = useTranslation('family')
  const groups = Array.from({ length: 30 }, (_, index) => {
    const date = dateOffset(today, index)
    const events = eventsForDate(space, date, viewerId).filter((event) => includeSensitive || (event.dataClass !== 'SENSITIVE' && event.scope !== 'PRIVATE'))
    return { date, events }
  }).filter((group) => group.events.length)
  return <section className="family-print-only">
    <h1>{t('print.title')}</h1>
    <p>{t('print.from', { date: formatDay(today) })} {includeSensitive ? t('print.withSensitive') : t('print.withoutSensitive')}</p>
    {groups.length ? groups.map((group) => <div key={group.date} style={{ breakInside: 'avoid', marginBottom: 16 }}><h2 style={{ fontSize: '1.1rem', borderBottom: '1px solid #aaa' }}>{formatDay(group.date)}</h2><ul>{group.events.map((event) => <li key={event.id}>{event.time ? `${event.time} · ` : ''}{event.title}</li>)}</ul></div>) : <p>{t('print.empty')}</p>}
  </section>
}
