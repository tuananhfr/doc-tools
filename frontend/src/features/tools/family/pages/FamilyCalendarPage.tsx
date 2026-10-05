import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard } from '@/features/tools/hub'
import { FamilyAgenda } from '../components/FamilyAgenda'
import { FamilyEventForm } from '../components/FamilyEventForm'
import { FamilyMembers } from '../components/FamilyMembers'
import { FamilyPortability } from '../components/FamilyPortability'
import { FamilyPrint } from '../components/FamilyPrint'
import { FamilySafety } from '../components/FamilySafety'
import { useFamilySpace } from '../hooks/useFamilySpace'
import { useForegroundReminders } from '../hooks/useForegroundReminders'
import type { EmergencyContact, FamilyEvent, FamilyMember, FamilyReminder, PendingSos } from '../core/family'

const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
type View = 'agenda' | 'add' | 'members' | 'backup' | 'safety'

export default function FamilyCalendarPage() {
  const { space, error, saving, update, replace } = useFamilySpace()
  const [view, setView] = useState<View>('agenda')
  const [viewerId, setViewerId] = useState('')
  const [printSensitive, setPrintSensitive] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const reminders = useForegroundReminders(space, viewerId || space?.members[0]?.id || '')
  if (!space) return <p role={error ? 'alert' : 'status'}>{error || 'Đang mở lịch lưu trên thiết bị...'}</p>
  const viewer = space.members.find((member) => member.id === viewerId) ?? space.members[0]
  const addEvent = async (event: FamilyEvent, reminder: FamilyReminder | null) => {
    await update((current) => ({ ...current, events: [...current.events, event], reminders: reminder ? [...current.reminders, reminder] : current.reminders, updatedAt: new Date().toISOString() }))
    setView('agenda')
  }
  const complete = (eventId: string, date: string) => update((current) => ({ ...current, events: current.events.map((event) => event.id === eventId ? { ...event, completedDates: event.completedDates.includes(date) ? event.completedDates.filter((item) => item !== date) : [...event.completedDates, date], updatedAt: new Date().toISOString() } : event), updatedAt: new Date().toISOString() }))
  const remove = (eventId: string) => update((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId), reminders: current.reminders.filter((reminder) => reminder.eventId !== eventId), updatedAt: new Date().toISOString() }))
  const addMember = (member: FamilyMember) => update((current) => ({ ...current, members: [...current.members, member], updatedAt: new Date().toISOString() }))
  const addContact = (contact: EmergencyContact) => update((current) => ({ ...current, emergencyContacts: [...current.emergencyContacts, contact], updatedAt: new Date().toISOString() }))
  const addSos = (sos: PendingSos) => update((current) => ({ ...current, sosQueue: [...current.sosQueue, sos], updatedAt: new Date().toISOString() }))
  const markSafe = (id: string) => update((current) => ({ ...current, sosQueue: current.sosQueue.map((sos) => sos.id === id ? { ...sos, status: 'SAFE' } : sos), updatedAt: new Date().toISOString() }))
  const updateLocation = (id: string, lastKnown: NonNullable<PendingSos['lastKnown']>) => update((current) => ({ ...current, sosQueue: current.sosQueue.map((sos) => sos.id === id ? { ...sos, lastKnown } : sos), updatedAt: new Date().toISOString() }))
  const restore = async (next: typeof space) => { await replace(next); setViewerId(next.members[0]?.id ?? ''); setView('agenda') }
  const print = (includeSensitive: boolean) => { setPrintSensitive(includeSensitive); requestAnimationFrame(() => window.print()) }

  return <>
    <style>{`.family-print-only { display: none; } @media print { body * { visibility: hidden !important; } .family-print-only, .family-print-only * { visibility: visible !important; } .family-print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; color: #111; background: white; } @page { size: A4; margin: 14mm; } } .family-senior { font-size: 1.15rem; } .family-senior button { min-height: 44px; }`}</style>
    <ToolBoard>
      <div className={viewer.profile === 'SENIOR' ? 'family-senior' : undefined}>
        <div className="erp-tool-panel mb-3"><p className="mb-2"><strong>Lưu trên thiết bị này</strong> · {space.events.length} lịch · {space.members.length} thành viên</p><p className="mb-0">Không cần tài khoản. Xóa dữ liệu trình duyệt sẽ mất lịch nếu bạn chưa tải bản sao lưu. Chưa bật chia sẻ hoặc đồng bộ qua mạng.</p>{error ? <p role="alert" className="mt-2">{error}</p> : null}</div>
        {notificationPermission === 'default' ? <div className="mb-3"><Button variant="outline-secondary" onClick={() => void Notification.requestPermission().then(setNotificationPermission)}>Bật thông báo khi trang đang mở</Button></div> : null}
        {reminders.alerts.length ? <div className="erp-tool-panel mb-3" role="status"><strong>Nhắc việc khi trang đang mở</strong>{reminders.alerts.map((alert) => <div key={alert.key} className="d-flex justify-content-between gap-2 mt-2"><span>{alert.title} · {alert.date} {alert.time}</span><Button size="sm" variant="outline-secondary" onClick={() => reminders.dismiss(alert.key)}>Đã xem</Button></div>)}</div> : null}
        <div className="d-flex flex-wrap gap-2 align-items-end mb-3 family-no-print">
          <label className="erp-flow-field__label">Đang xem cho<Form.Select value={viewer.id} onChange={(event) => setViewerId(event.target.value)}>{space.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</Form.Select></label>
          {([['agenda', 'Lịch'], ['add', 'Thêm'], ['members', 'Thành viên'], ['backup', 'Sao lưu'], ['safety', 'SOS & liên hệ']] as [View, string][]).filter(([key]) => viewer.profile !== 'SENIOR' || ['agenda', 'safety'].includes(key)).map(([key, label]) => <Button key={key} variant={view === key ? 'primary' : 'outline-secondary'} onClick={() => setView(key)}>{label}</Button>)}
        </div>
        {view === 'agenda' ? <FamilyAgenda space={space} today={todayInVietnam()} viewerId={viewer.id} onComplete={complete} onDelete={remove} disabled={saving} /> : null}
        {view === 'add' ? <FamilyEventForm members={space.members} today={todayInVietnam()} onSave={addEvent} disabled={saving} /> : null}
        {view === 'members' ? <FamilyMembers members={space.members} onAdd={addMember} disabled={saving} /> : null}
        {view === 'backup' ? <FamilyPortability space={space} onRestore={restore} onPrint={print} disabled={saving} /> : null}
        {view === 'safety' ? <FamilySafety space={space} onAddContact={addContact} onSos={addSos} onSafe={markSafe} onLocation={updateLocation} disabled={saving} /> : null}
      </div>
      <FamilyPrint space={space} today={todayInVietnam()} viewerId={viewer.id} includeSensitive={printSensitive} />
    </ToolBoard>
  </>
}
