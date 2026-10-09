import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { FamilyCategory, FamilyDataClass, FamilyEvent, FamilyMember, FamilyReminder, FamilyScope, Recurrence } from '../core/family'
import { newId } from '@/utils/id'

export interface FamilyEventDraft { date: string; title?: string; recurrence?: Recurrence; hint?: string }
interface Props {
  members: FamilyMember[]
  onSave: (event: FamilyEvent, reminder: FamilyReminder | null) => Promise<void>
  onCancel?: () => void
  disabled: boolean
  draft: FamilyEventDraft
  editing?: { event: FamilyEvent; reminder: FamilyReminder | null }
}

const CATEGORIES: FamilyCategory[] = ['task', 'school', 'appointment', 'deadline', 'medication', 'payment', 'other']
const RECURRENCES: Recurrence[] = ['once', 'daily', 'weekly', 'monthly', 'yearly']
const SCOPES: FamilyScope[] = ['FAMILY_ALL', 'PARENTS_SENIORS', 'PARENTS_CHILDREN', 'PRIVATE']
const DATA_CLASSES: FamilyDataClass[] = ['NORMAL', 'PRIVATE', 'SENSITIVE']

// Form chỉ đọc `draft` / `editing` lúc khởi tạo: nơi gọi đổi `key` để mở một form mới.
export function FamilyEventForm({ members, onSave, onCancel, disabled, draft, editing }: Props) {
  const { t } = useTranslation('family')
  const source = editing?.event
  const [title, setTitle] = useState(source?.title ?? draft.title ?? '')
  const [date, setDate] = useState(source?.date ?? draft.date)
  const [time, setTime] = useState(source?.time ?? '')
  const [notes, setNotes] = useState(source?.notes ?? '')
  const [category, setCategory] = useState<FamilyCategory>(source?.category ?? 'task')
  const [recurrence, setRecurrence] = useState<Recurrence>(source?.recurrence ?? draft.recurrence ?? 'once')
  const [scope, setScope] = useState<FamilyScope>(source?.scope ?? 'FAMILY_ALL')
  const [dataClass, setDataClass] = useState<FamilyDataClass>(source?.dataClass ?? 'NORMAL')
  const [memberId, setMemberId] = useState(source ? source.memberIds[0] ?? '' : members[0]?.id ?? '')
  const [reminderMinutes, setReminderMinutes] = useState(editing?.reminder ? String(editing.reminder.minutesBefore) : '')
  const [error, setError] = useState('')
  const changeCategory = (value: FamilyCategory) => { setCategory(value); if (value === 'medication') setDataClass('SENSITIVE') }
  const save = async () => {
    if (!title.trim() || !date) return
    if (reminderMinutes !== '' && (!time || !Number.isInteger(Number(reminderMinutes)) || Number(reminderMinutes) < 0 || Number(reminderMinutes) > 1440)) { setError(t('form.reminderInvalid')); return }
    const timestamp = new Date().toISOString()
    // Sửa thì giữ nguyên id, ngày tạo và các lần đã đánh dấu xong: spec yêu cầu ID không đổi.
    const event: FamilyEvent = { id: source?.id ?? newId(), title: title.trim(), date, time, notes: notes.trim(), category, recurrence, scope, dataClass, memberIds: memberId ? [memberId] : [], completedDates: source?.completedDates ?? [], createdAt: source?.createdAt ?? timestamp, updatedAt: timestamp }
    const reminder: FamilyReminder | null = reminderMinutes === '' ? null : { id: editing?.reminder?.id ?? newId(), eventId: event.id, minutesBefore: Number(reminderMinutes), recipientMemberIds: event.memberIds, hideDetails: dataClass === 'SENSITIVE' }
    try { await onSave(event, reminder); setError('') }
    catch { setError(t('form.saveFailed')) }
  }
  return <div className="erp-tool-panel cn-family-form">
    <h2 className="h5">{source ? t('form.editTitle') : t('form.addTitle')}</h2>
    {draft.hint ? <p className="cn-family-form__hint">{draft.hint}</p> : null}
    <div className="erp-tool-form__grid">
      <label className="erp-flow-field__label">{t('form.title')}<Form.Control maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="erp-flow-field__label">{t('form.date')}<Form.Control type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="erp-flow-field__label">{t('form.time')}<Form.Control type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="erp-flow-field__label">{t('form.category')}<Form.Select value={category} onChange={(event) => changeCategory(event.target.value as FamilyCategory)}>{CATEGORIES.map((key) => <option value={key} key={key}>{t(`form.categories.${key}`)}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">{t('form.recurrence')}<Form.Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Recurrence)}>{RECURRENCES.map((key) => <option value={key} key={key}>{t(`recurrence.${key}`)}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">{t('shared.members')}<Form.Select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">{t('form.scope')}<Form.Select value={scope} onChange={(event) => setScope(event.target.value as FamilyScope)}>{SCOPES.map((key) => <option value={key} key={key}>{t(`form.scopes.${key}`)}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">{t('form.privacy')}<Form.Select value={dataClass} onChange={(event) => setDataClass(event.target.value as FamilyDataClass)}>{DATA_CLASSES.map((key) => <option value={key} key={key}>{t(`dataClasses.${key}`)}</option>)}</Form.Select></label>
      <label className="erp-flow-field__label">{t('form.reminder')}<Form.Control type="number" min="0" max="1440" step="1" value={reminderMinutes} onChange={(event) => setReminderMinutes(event.target.value)} /></label>
    </div>
    <label className="erp-flow-field__label mt-3">{t('shared.notes')}<Form.Control as="textarea" rows={3} maxLength={10000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    {category === 'medication' ? <p className="mt-3">{t('form.medicationNote')}</p> : null}
    <p className="mt-3">{t('form.reminderNote')}</p>
    {error ? <p role="alert">{error}</p> : null}
    <div className="d-flex flex-wrap gap-2 mt-3">
      <Button disabled={disabled || !title.trim() || !date} onClick={() => void save()}>{source ? t('form.saveChanges') : t('form.saveNew')}</Button>
      {onCancel ? <Button variant="outline-secondary" disabled={disabled} onClick={onCancel}>{t('form.cancel')}</Button> : null}
    </div>
  </div>
}
