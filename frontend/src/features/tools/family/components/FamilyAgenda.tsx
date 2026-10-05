import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { dateOffset, eventsForDate, type FamilyEvent, type FamilySpace } from '../core/family'

interface Props { space: FamilySpace; today: string; viewerId: string; onComplete: (eventId: string, date: string) => Promise<void>; onDelete: (eventId: string) => Promise<void>; disabled: boolean }

export function FamilyAgenda({ space, today, viewerId, onComplete, onDelete, disabled }: Props) {
  const [view, setView] = useState<'today' | 'week' | 'upcoming'>('today')
  const dates = useMemo(() => Array.from({ length: view === 'today' ? 1 : view === 'week' ? 7 : 30 }, (_, index) => dateOffset(today, index)), [today, view])
  const groups = dates.map((date) => ({ date, events: eventsForDate(space, date, viewerId) })).filter((group) => group.events.length > 0)
  const memberName = (event: FamilyEvent) => event.memberIds.map((id) => space.members.find((member) => member.id === id)?.name).filter(Boolean).join(', ')
  return <section className="erp-tool-panel">
    <h2 className="h5">Lịch của gia đình</h2>
    <div className="d-flex flex-wrap gap-2 mb-3 family-no-print"><Button variant={view === 'today' ? 'primary' : 'outline-secondary'} onClick={() => setView('today')}>Hôm nay</Button><Button variant={view === 'week' ? 'primary' : 'outline-secondary'} onClick={() => setView('week')}>7 ngày tới</Button><Button variant={view === 'upcoming' ? 'primary' : 'outline-secondary'} onClick={() => setView('upcoming')}>30 ngày tới</Button></div>
    {!groups.length ? <p>Chưa có lịch trong khoảng này. Lịch đã tạo vẫn lưu trên thiết bị.</p> : groups.map((group) => <div key={group.date} className="mb-4">
      <h3 className="h6">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${group.date}T00:00:00Z`))}</h3>
      <ul className="list-unstyled">{group.events.map((event) => {
        const completed = event.completedDates.includes(group.date)
        return <li key={`${event.id}-${group.date}`} className="d-flex align-items-start justify-content-between gap-3 border rounded p-3 mb-2">
          <div><strong style={{ textDecoration: completed ? 'line-through' : undefined }}>{event.time ? `${event.time} · ` : ''}{event.title}</strong><div className="small">{memberName(event)} · {event.recurrence === 'once' ? 'Một lần' : event.recurrence === 'daily' ? 'Hằng ngày' : event.recurrence === 'weekly' ? 'Hằng tuần' : event.recurrence === 'monthly' ? 'Hằng tháng' : 'Hằng năm'}{event.dataClass === 'SENSITIVE' ? ' · Nhạy cảm' : ''}</div>{event.notes ? <p className="mb-0 mt-2">{event.notes}</p> : null}</div>
          <div className="d-flex flex-column gap-2 family-no-print"><Button size="sm" variant={completed ? 'outline-secondary' : 'outline-primary'} disabled={disabled} onClick={() => void onComplete(event.id, group.date)}>{completed ? 'Bỏ hoàn tất' : 'Đã xong'}</Button><Button size="sm" variant="link" disabled={disabled} onClick={() => { if (window.confirm('Xóa lịch này và mọi lần lặp lại trên thiết bị?')) void onDelete(event.id) }}>Xóa</Button></div>
        </li>
      })}</ul>
    </div>)}
    {view === 'upcoming' ? <p className="small">Hiển thị 30 ngày kể từ hôm nay. Lịch lặp vẫn còn sau khoảng này.</p> : null}
  </section>
}
