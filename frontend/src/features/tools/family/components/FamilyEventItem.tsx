import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { FamilyEvent } from '../core/family'

interface Props {
  event: FamilyEvent
  date: string
  members: string
  disabled: boolean
  onComplete: (eventId: string, date: string) => Promise<void>
  onEdit?: (event: FamilyEvent) => void
  onDelete: (eventId: string) => Promise<void>
}

export function FamilyEventItem({ event, date, members, disabled, onComplete, onEdit, onDelete }: Props) {
  const { t } = useTranslation('family')
  const completed = event.completedDates.includes(date)
  const meta = [members, t(`recurrence.${event.recurrence}`), event.dataClass === 'SENSITIVE' ? t('dataClasses.SENSITIVE') : ''].filter(Boolean).join(' · ')
  return <li className={`cn-family-event${completed ? ' is-done' : ''}`}>
    <div className="cn-family-event__body">
      <strong>{event.time ? <span className="cn-family-event__time">{event.time}</span> : null}{event.title}</strong>
      <small>{meta}</small>
      {event.notes ? <p>{event.notes}</p> : null}
    </div>
    <div className="cn-family-event__actions family-no-print">
      <Button size="sm" variant={completed ? 'outline-secondary' : 'outline-primary'} disabled={disabled} onClick={() => void onComplete(event.id, date)}>{completed ? t('event.undo') : t('event.done')}</Button>
      {onEdit ? <Button size="sm" variant="link" disabled={disabled} onClick={() => onEdit(event)}>{t('event.edit')}</Button> : null}
      <Button size="sm" variant="link" className="cn-family-event__delete" disabled={disabled} onClick={() => { if (window.confirm(t('event.confirmDelete'))) void onDelete(event.id) }}>{t('event.delete')}</Button>
    </div>
  </li>
}
