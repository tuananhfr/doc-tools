import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { solarToLunar, type Holiday } from '@/features/tools/vietnam'
import { formatDayHeading } from '../core/event-labels'
import type { FamilyEvent } from '../core/family'
import { FamilyEventItem } from './FamilyEventItem'

interface Props {
  date: string
  holidays: Holiday[]
  events: FamilyEvent[]
  memberNames: (event: FamilyEvent) => string
  disabled: boolean
  canEdit: boolean
  onAdd: (date: string, holiday?: Holiday) => void
  onEdit: (event: FamilyEvent) => void
  onComplete: (eventId: string, date: string) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
}

export function FamilyDayPanel({ date, holidays, events, memberNames, disabled, canEdit, onAdd, onEdit, onComplete, onDelete }: Props) {
  const { t } = useTranslation(['family', 'vietnam'])
  const [year, month, day] = date.split('-').map(Number)
  const lunar = solarToLunar({ year, month, day })
  return <section className="cn-cal-panel" aria-live="polite">
    <header className="cn-cal-panel__head">
      <h3>{formatDayHeading(date)}</h3>
      {lunar ? <p>{t(lunar.leap ? 'day.lunarLeap' : 'day.lunar', { day: lunar.day, month: lunar.month })}</p> : null}
    </header>
    {holidays.length ? <ul className="cn-cal-holidays">
      {holidays.map((holiday) => <li key={holiday.id} className={`cn-cal-holiday cn-cal-holiday--${holiday.layer}`}>
        <span className="cn-cal-swatch" aria-hidden="true" />
        <span className="cn-cal-holiday__text"><strong>{holiday.name}</strong><small>{t(`vietnam:holidayLayers.${holiday.layer}`)} · {holiday.lunar ? t('day.byLunar') : t('day.bySolar')}</small></span>
        {canEdit && holiday.layer !== 'moon' ? <Button size="sm" variant="link" disabled={disabled} onClick={() => onAdd(date, holiday)}>{t('day.addReminder')}</Button> : null}
      </li>)}
    </ul> : null}
    {events.length ? <ul className="cn-family-events">{events.map((event) => <FamilyEventItem key={event.id} event={event} date={date} members={memberNames(event)} disabled={disabled} onComplete={onComplete} onEdit={canEdit ? onEdit : undefined} onDelete={onDelete} />)}</ul>
      : <p className="cn-family-panel__empty">{t('day.empty')}</p>}
    {canEdit ? <Button className="cn-family-panel__add" disabled={disabled} onClick={() => onAdd(date)}><Icon name="plus-lg" /> {t('day.addToDay')}</Button> : null}
  </section>
}
