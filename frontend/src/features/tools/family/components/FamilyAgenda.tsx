import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { formatDayHeading } from '../core/event-labels'
import { dateOffset, eventsForDate, type FamilyEvent, type FamilySpace } from '../core/family'
import { holidaysInRange, type HolidayLayer } from '@/features/tools/vietnam'
import { FamilyEventItem } from './FamilyEventItem'

interface Props {
  space: FamilySpace
  today: string
  viewerId: string
  layers: HolidayLayer[]
  memberNames: (event: FamilyEvent) => string
  onComplete: (eventId: string, date: string) => Promise<void>
  onEdit?: (event: FamilyEvent) => void
  onDelete: (eventId: string) => Promise<void>
  disabled: boolean
}

const RANGES = [['today', 1], ['week', 7], ['upcoming', 30]] as const

export function FamilyAgenda({ space, today, viewerId, layers, memberNames, onComplete, onEdit, onDelete, disabled }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('today')
  const { t } = useTranslation('family')
  const length = RANGES.find(([key]) => key === range)?.[1] ?? 1
  const groups = useMemo(() => {
    const dates = Array.from({ length }, (_, index) => dateOffset(today, index))
    // Mùng 1 / Rằm lặp mỗi nửa tháng; trong danh sách chỉ làm loãng các việc thật nên bỏ.
    const holidays = holidaysInRange(dates[0], dates[dates.length - 1]).filter((holiday) => holiday.layer !== 'moon' && layers.includes(holiday.layer))
    return dates
      .map((date) => ({ date, holidays: holidays.filter((holiday) => holiday.date === date), events: eventsForDate(space, date, viewerId) }))
      .filter((group) => group.events.length || group.holidays.length)
  }, [length, today, layers, space, viewerId])
  return <section className="erp-tool-panel cn-family-agenda">
    <div className="cn-family-segment family-no-print" role="group" aria-label={t('agenda.rangeLabel')}>
      {RANGES.map(([key]) => <Button key={key} size="sm" variant={range === key ? 'primary' : 'outline-secondary'} aria-pressed={range === key} onClick={() => setRange(key)}>{t(`agenda.ranges.${key}`)}</Button>)}
    </div>
    {!groups.length ? <p className="cn-family-panel__empty">{t('agenda.empty')}</p> : groups.map((group) => <div key={group.date} className="cn-family-agenda__day">
      <h3>{formatDayHeading(group.date)}</h3>
      {group.holidays.length ? <ul className="cn-cal-holidays">{group.holidays.map((holiday) => <li key={holiday.id} className={`cn-cal-holiday cn-cal-holiday--${holiday.layer}`}><span className="cn-cal-swatch" aria-hidden="true" /><span className="cn-cal-holiday__text"><strong>{holiday.name}</strong></span></li>)}</ul> : null}
      {group.events.length ? <ul className="cn-family-events">{group.events.map((event) => <FamilyEventItem key={`${event.id}-${group.date}`} event={event} date={group.date} members={memberNames(event)} disabled={disabled} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />)}</ul> : null}
    </div>)}
    {range === 'upcoming' ? <p className="small mb-0">{t('agenda.upcomingNote')}</p> : null}
  </section>
}
