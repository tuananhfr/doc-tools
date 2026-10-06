import { Button } from 'react-bootstrap'
import { RECURRENCE_LABELS } from '../core/event-labels'
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
  const completed = event.completedDates.includes(date)
  const meta = [members, RECURRENCE_LABELS[event.recurrence], event.dataClass === 'SENSITIVE' ? 'Nhạy cảm' : ''].filter(Boolean).join(' · ')
  return <li className={`cn-family-event${completed ? ' is-done' : ''}`}>
    <div className="cn-family-event__body">
      <strong>{event.time ? <span className="cn-family-event__time">{event.time}</span> : null}{event.title}</strong>
      <small>{meta}</small>
      {event.notes ? <p>{event.notes}</p> : null}
    </div>
    <div className="cn-family-event__actions family-no-print">
      <Button size="sm" variant={completed ? 'outline-secondary' : 'outline-primary'} disabled={disabled} onClick={() => void onComplete(event.id, date)}>{completed ? 'Bỏ hoàn tất' : 'Đã xong'}</Button>
      {onEdit ? <Button size="sm" variant="link" disabled={disabled} onClick={() => onEdit(event)}>Sửa</Button> : null}
      <Button size="sm" variant="link" className="cn-family-event__delete" disabled={disabled} onClick={() => { if (window.confirm('Xóa lịch này và mọi lần lặp lại trên thiết bị?')) void onDelete(event.id) }}>Xóa</Button>
    </div>
  </li>
}
