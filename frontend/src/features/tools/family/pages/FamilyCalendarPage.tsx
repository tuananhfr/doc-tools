import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard } from '@/features/tools/hub'
import { FamilyAgenda } from '../components/FamilyAgenda'
import { FamilyDayPanel } from '../components/FamilyDayPanel'
import { FamilyEventForm, type FamilyEventDraft } from '../components/FamilyEventForm'
import { FamilyLayerToggles } from '../components/FamilyLayerToggles'
import { FamilyMembers } from '../components/FamilyMembers'
import { FamilyMonthView } from '../components/FamilyMonthView'
import { FamilyPortability } from '../components/FamilyPortability'
import { FamilyPrint } from '../components/FamilyPrint'
import { FamilySafety } from '../components/FamilySafety'
import { useFamilySpace } from '../hooks/useFamilySpace'
import { useForegroundReminders } from '../hooks/useForegroundReminders'
import { useHolidayLayers } from '../hooks/useHolidayLayers'
import { buildMonthGrid, shiftMonth } from '../core/month-grid'
import { holidaysInRange, type Holiday } from '../core/vietnam-holidays'
import { eventsForDate, type EmergencyContact, type FamilyEvent, type FamilyMember, type FamilyReminder, type PendingSos } from '../core/family'

const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
type View = 'calendar' | 'list' | 'members' | 'backup' | 'safety'
interface Editor { key: number; draft: FamilyEventDraft; editing?: { event: FamilyEvent; reminder: FamilyReminder | null } }

const VIEWS: [View, string][] = [['calendar', 'Lịch'], ['list', 'Danh sách'], ['members', 'Thành viên'], ['backup', 'Sao lưu'], ['safety', 'SOS & liên hệ']]
const LUNAR_DRAFT_HINT = 'Ngày âm lịch rơi vào ngày dương khác nhau mỗi năm. Lịch chưa lặp được theo âm lịch nên nhắc này chỉ áp dụng cho năm nay.'

export default function FamilyCalendarPage() {
  const { space, error, saving, update, replace } = useFamilySpace()
  const { layers, toggle } = useHolidayLayers()
  const [today] = useState(todayInVietnam)
  const [view, setView] = useState<View>('calendar')
  const [viewerId, setViewerId] = useState('')
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }))
  const [selected, setSelected] = useState(today)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [printSensitive, setPrintSensitive] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const reminders = useForegroundReminders(space, viewerId || space?.members[0]?.id || '')
  const viewer = space?.members.find((member) => member.id === viewerId) ?? space?.members[0]

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor])
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>()
    for (const holiday of holidaysInRange(grid[0].date, grid[grid.length - 1].date)) {
      if (layers.includes(holiday.layer)) map.set(holiday.date, [...(map.get(holiday.date) ?? []), holiday])
    }
    return map
  }, [grid, layers])
  const eventsByDate = useMemo(() => new Map(space && viewer ? grid.map((cell) => [cell.date, eventsForDate(space, cell.date, viewer.id)]) : []), [grid, space, viewer])

  if (!space || !viewer) return <p role={error ? 'alert' : 'status'}>{error || 'Đang mở lịch lưu trên thiết bị...'}</p>
  const senior = viewer.profile === 'SENIOR'
  const memberNames = (event: FamilyEvent) => event.memberIds.map((id) => space.members.find((member) => member.id === id)?.name).filter(Boolean).join(', ')
  const touch = () => new Date().toISOString()

  const openEditor = (draft: FamilyEventDraft, editing?: Editor['editing']) => setEditor((current) => ({ key: (current?.key ?? 0) + 1, draft, editing }))
  const addOn = (date: string, holiday?: Holiday) => openEditor(holiday ? { date, title: holiday.name, recurrence: holiday.lunar ? 'once' : 'yearly', hint: holiday.lunar ? LUNAR_DRAFT_HINT : undefined } : { date })
  const edit = (event: FamilyEvent) => openEditor({ date: event.date }, { event, reminder: space.reminders.find((reminder) => reminder.eventId === event.id) ?? null })
  const selectDate = (date: string) => { setSelected(date); setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) }) }
  const saveEvent = async (event: FamilyEvent, reminder: FamilyReminder | null) => {
    await update((current) => ({
      ...current,
      events: current.events.some((item) => item.id === event.id) ? current.events.map((item) => item.id === event.id ? event : item) : [...current.events, event],
      reminders: [...current.reminders.filter((item) => item.eventId !== event.id), ...(reminder ? [reminder] : [])],
      updatedAt: touch(),
    }))
    setEditor(null)
    selectDate(event.date)
  }
  const complete = (eventId: string, date: string) => update((current) => ({ ...current, events: current.events.map((event) => event.id === eventId ? { ...event, completedDates: event.completedDates.includes(date) ? event.completedDates.filter((item) => item !== date) : [...event.completedDates, date], updatedAt: touch() } : event), updatedAt: touch() }))
  const remove = async (eventId: string) => {
    await update((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId), reminders: current.reminders.filter((reminder) => reminder.eventId !== eventId), updatedAt: touch() }))
    if (editor?.editing?.event.id === eventId) setEditor(null)
  }
  const addMember = (member: FamilyMember) => update((current) => ({ ...current, members: [...current.members, member], updatedAt: touch() }))
  const addContact = (contact: EmergencyContact) => update((current) => ({ ...current, emergencyContacts: [...current.emergencyContacts, contact], updatedAt: touch() }))
  const addSos = (sos: PendingSos) => update((current) => ({ ...current, sosQueue: [...current.sosQueue, sos], updatedAt: touch() }))
  const markSafe = (id: string) => update((current) => ({ ...current, sosQueue: current.sosQueue.map((sos) => sos.id === id ? { ...sos, status: 'SAFE' } : sos), updatedAt: touch() }))
  const updateLocation = (id: string, lastKnown: NonNullable<PendingSos['lastKnown']>) => update((current) => ({ ...current, sosQueue: current.sosQueue.map((sos) => sos.id === id ? { ...sos, lastKnown } : sos), updatedAt: touch() }))
  const restore = async (next: typeof space) => { await replace(next); setViewerId(next.members[0]?.id ?? ''); setEditor(null); setView('calendar') }
  const print = (includeSensitive: boolean) => { setPrintSensitive(includeSensitive); requestAnimationFrame(() => window.print()) }
  const changeView = (next: View) => { setView(next); setEditor(null) }

  const form = editor ? <FamilyEventForm key={editor.key} members={space.members} draft={editor.draft} editing={editor.editing} onSave={saveEvent} onCancel={() => setEditor(null)} disabled={saving} /> : null

  return <>
    <style>{`.family-print-only { display: none; } @media print { body * { visibility: hidden !important; } .family-print-only, .family-print-only * { visibility: visible !important; } .family-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; color: #111; background: white; } @page { size: A4; margin: 14mm; } } .family-senior { font-size: 1.15rem; } .family-senior button { min-height: 44px; }`}</style>
    <ToolBoard>
      <div className={`cn-family${senior ? ' family-senior' : ''}`}>
        <p className="cn-family-storage"><strong>Lưu trên thiết bị này</strong> · {space.events.length} lịch · {space.members.length} thành viên. Không cần tài khoản. Xóa dữ liệu trình duyệt sẽ mất lịch nếu bạn chưa tải bản sao lưu. Chưa bật chia sẻ hoặc đồng bộ qua mạng.</p>
        {error ? <p role="alert">{error}</p> : null}
        {notificationPermission === 'default' ? <div className="mb-3"><Button variant="outline-secondary" size="sm" onClick={() => void Notification.requestPermission().then(setNotificationPermission)}>Bật thông báo khi trang đang mở</Button></div> : null}
        {reminders.alerts.length ? <div className="erp-tool-panel mb-3" role="status"><strong>Nhắc việc khi trang đang mở</strong>{reminders.alerts.map((alert) => <div key={alert.key} className="d-flex justify-content-between gap-2 mt-2"><span>{alert.title} · {alert.date} {alert.time}</span><Button size="sm" variant="outline-secondary" onClick={() => reminders.dismiss(alert.key)}>Đã xem</Button></div>)}</div> : null}
        <div className="cn-family-toolbar family-no-print">
          <div className="cn-family-segment" role="tablist" aria-label="Chế độ xem">
            {VIEWS.filter(([key]) => !senior || ['calendar', 'safety'].includes(key)).map(([key, label]) => <Button key={key} role="tab" aria-selected={view === key} variant={view === key ? 'primary' : 'outline-secondary'} onClick={() => changeView(key)}>{label}</Button>)}
          </div>
          <label className="cn-family-viewer">Đang xem cho<Form.Select size="sm" value={viewer.id} onChange={(event) => setViewerId(event.target.value)}>{space.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</Form.Select></label>
        </div>
        {view === 'calendar' || view === 'list' ? <FamilyLayerToggles layers={layers} onToggle={toggle} /> : null}
        {view === 'calendar' ? <div className="cn-family-layout">
          <FamilyMonthView year={cursor.year} month={cursor.month} today={today} selected={selected} holidays={holidaysByDate} events={eventsByDate}
            onSelect={(date) => { selectDate(date); setEditor(null) }}
            onShift={(offset) => setCursor((current) => shiftMonth(current.year, current.month, offset))}
            onToday={() => selectDate(today)} />
          <div className="cn-family-side">
            {form ?? <FamilyDayPanel date={selected} holidays={holidaysByDate.get(selected) ?? holidaysInRange(selected, selected).filter((holiday) => layers.includes(holiday.layer))} events={eventsForDate(space, selected, viewer.id)} memberNames={memberNames} disabled={saving} canEdit={!senior} onAdd={addOn} onEdit={edit} onComplete={complete} onDelete={remove} />}
          </div>
        </div> : null}
        {view === 'list' ? <>{form}<FamilyAgenda space={space} today={today} viewerId={viewer.id} layers={layers} memberNames={memberNames} onComplete={complete} onEdit={senior ? undefined : edit} onDelete={remove} disabled={saving} /></> : null}
        {view === 'members' ? <FamilyMembers members={space.members} onAdd={addMember} disabled={saving} /> : null}
        {view === 'backup' ? <FamilyPortability space={space} onRestore={restore} onPrint={print} disabled={saving} /> : null}
        {view === 'safety' ? <FamilySafety space={space} onAddContact={addContact} onSos={addSos} onSafe={markSafe} onLocation={updateLocation} disabled={saving} /> : null}
      </div>
      <FamilyPrint space={space} today={today} viewerId={viewer.id} includeSensitive={printSensitive} />
    </ToolBoard>
  </>
}
