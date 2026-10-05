import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import type { FamilyCategory, FamilyDataClass, FamilyEvent, FamilyMember, FamilyReminder, FamilyScope, Recurrence } from '../core/family'

interface Props { members: FamilyMember[]; onSave: (event: FamilyEvent, reminder: FamilyReminder | null) => Promise<void>; disabled: boolean; today: string }

const CATEGORIES: [FamilyCategory, string][] = [['task', 'Việc gia đình'], ['school', 'Học tập'], ['appointment', 'Lịch hẹn'], ['deadline', 'Hạn giấy tờ'], ['medication', 'Nhắc thuốc'], ['payment', 'Thanh toán'], ['other', 'Khác']]
const RECURRENCES: [Recurrence, string][] = [['once', 'Một lần'], ['daily', 'Hằng ngày'], ['weekly', 'Hằng tuần'], ['monthly', 'Hằng tháng'], ['yearly', 'Hằng năm']]
const SCOPES: [FamilyScope, string][] = [['FAMILY_ALL', 'Cả gia đình'], ['PARENTS_SENIORS', 'Bố mẹ và ông bà'], ['PARENTS_CHILDREN', 'Bố mẹ và con'], ['PRIVATE', 'Chỉ trên thiết bị này']]

export function FamilyEventForm({ members, onSave, disabled, today }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState<FamilyCategory>('task')
  const [recurrence, setRecurrence] = useState<Recurrence>('once')
  const [scope, setScope] = useState<FamilyScope>('FAMILY_ALL')
  const [dataClass, setDataClass] = useState<FamilyDataClass>('NORMAL')
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [reminderMinutes, setReminderMinutes] = useState('')
  const [error, setError] = useState('')
  const changeCategory = (value: FamilyCategory) => { setCategory(value); if (value === 'medication') setDataClass('SENSITIVE') }
  const save = async () => {
    if (!title.trim() || !date) return
    if (reminderMinutes !== '' && (!time || !Number.isInteger(Number(reminderMinutes)) || Number(reminderMinutes) < 0 || Number(reminderMinutes) > 1440)) { setError('Nhắc việc cần giờ cụ thể và khoảng nhắc từ 0 đến 1.440 phút.'); return }
    const timestamp = new Date().toISOString()
    const event: FamilyEvent = { id: crypto.randomUUID(), title: title.trim(), date, time, notes: notes.trim(), category, recurrence, scope, dataClass, memberIds: memberId ? [memberId] : [], completedDates: [], createdAt: timestamp, updatedAt: timestamp }
    const reminder: FamilyReminder | null = reminderMinutes === '' ? null : { id: crypto.randomUUID(), eventId: event.id, minutesBefore: Number(reminderMinutes), recipientMemberIds: event.memberIds, hideDetails: dataClass === 'SENSITIVE' }
    try { await onSave(event, reminder); setTitle(''); setNotes(''); setError('') }
    catch { setError('Không lưu được lịch. Kiểm tra ngày và dữ liệu đã nhập.') }
  }
  return <div className="erp-tool-panel">
    <h2 className="h5">Thêm lịch gia đình</h2>
    <div className="erp-tool-form__grid">
      <label className="erp-flow-field__label">Tên việc<Form.Control maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="erp-flow-field__label">Ngày<Form.Control type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="erp-flow-field__label">Giờ (không bắt buộc)<Form.Control type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="erp-flow-field__label">Loại việc<Form.Select value={category} onChange={(event) => changeCategory(event.target.value as FamilyCategory)}>{CATEGORIES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">Lặp lại<Form.Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}>{RECURRENCES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">Thành viên<Form.Select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">Phạm vi<Form.Select value={scope} onChange={(event) => setScope(event.target.value as FamilyScope)}>{SCOPES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">Độ riêng tư<Form.Select value={dataClass} onChange={(event) => setDataClass(event.target.value as FamilyDataClass)}><option value="NORMAL">Thông thường</option><option value="PRIVATE">Riêng tư</option><option value="SENSITIVE">Nhạy cảm</option></Form.Select></label>
      <label className="erp-flow-field__label">Nhắc trước (phút, tối đa 1 ngày; cần nhập giờ)<Form.Control type="number" min="0" max="1440" step="1" value={reminderMinutes} onChange={(event) => setReminderMinutes(event.target.value)} /></label>
    </div>
    <label className="erp-flow-field__label mt-3">Ghi chú<Form.Control as="textarea" rows={3} maxLength={10000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    {category === 'medication' ? <p className="mt-3">Nhắc thuốc chỉ theo dữ liệu bạn nhập; không phải tư vấn y tế. Nội dung nhạy cảm được ẩn trên thông báo mặc định.</p> : null}
    <p className="mt-3">Nhắc việc chỉ hiện khi trang đang mở hoặc trình duyệt cho phép thông báo; hệ điều hành có thể tạm dừng trang.</p>
    {error ? <p role="alert">{error}</p> : null}
    <Button className="mt-3" disabled={disabled || !title.trim() || !date} onClick={() => void save()}>Lưu lịch trên thiết bị</Button>
  </div>
}
