import { dateOffset, eventsForDate, type FamilySpace } from '../core/family'

interface Props { space: FamilySpace; today: string; viewerId: string; includeSensitive: boolean }

export function FamilyPrint({ space, today, viewerId, includeSensitive }: Props) {
  const groups = Array.from({ length: 30 }, (_, index) => {
    const date = dateOffset(today, index)
    const events = eventsForDate(space, date, viewerId).filter((event) => includeSensitive || (event.dataClass !== 'SENSITIVE' && event.scope !== 'PRIVATE'))
    return { date, events }
  }).filter((group) => group.events.length)
  return <section className="family-print-only">
    <h1>Lịch Gia Đình · 30 ngày tới</h1>
    <p>Từ {today}. {includeSensitive ? 'Có lịch riêng tư và nhạy cảm.' : 'Không gồm lịch riêng tư và nhạy cảm.'}</p>
    {groups.length ? groups.map((group) => <div key={group.date} style={{ breakInside: 'avoid', marginBottom: 16 }}><h2 style={{ fontSize: '1.1rem', borderBottom: '1px solid #aaa' }}>{group.date}</h2><ul>{group.events.map((event) => <li key={event.id}>{event.time ? `${event.time} · ` : ''}{event.title}</li>)}</ul></div>) : <p>Không có lịch trong khoảng này.</p>}
  </section>
}
