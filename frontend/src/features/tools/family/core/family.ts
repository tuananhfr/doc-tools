import { translate } from '@/i18n/runtime'
import { newId } from '@/utils/id'

export type FamilyScope = 'FAMILY_ALL' | 'PARENTS_SENIORS' | 'PARENTS_CHILDREN' | 'PRIVATE'
export type FamilyDataClass = 'NORMAL' | 'PRIVATE' | 'SENSITIVE'
export type FamilyCategory = 'school' | 'appointment' | 'deadline' | 'medication' | 'payment' | 'task' | 'other'
export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type MemberProfile = 'PARENT' | 'SENIOR' | 'CHILD'

export interface FamilyMember { id: string; name: string; profile: MemberProfile }
export interface FamilyEvent {
  id: string
  title: string
  date: string
  time: string
  notes: string
  category: FamilyCategory
  recurrence: Recurrence
  scope: FamilyScope
  dataClass: FamilyDataClass
  memberIds: string[]
  completedDates: string[]
  createdAt: string
  updatedAt: string
}
export interface FamilyReminder { id: string; eventId: string; minutesBefore: number; recipientMemberIds: string[]; hideDetails: boolean }
export interface EmergencyContact { id: string; name: string; phone: string }
export interface PendingSos { id: string; createdAt: string; status: 'PENDING_LOCAL' | 'SAFE'; lastKnown?: { latitude: number; longitude: number; capturedAt: string } }
export interface FamilySpace {
  schemaVersion: 1
  familyId: string
  mode: 'LOCAL_ONLY' | 'FAMILY_SHARE' | 'ACCOUNT_BACKED'
  members: FamilyMember[]
  events: FamilyEvent[]
  reminders: FamilyReminder[]
  emergencyContacts: EmergencyContact[]
  sosQueue: PendingSos[]
  updatedAt: string
}

export function createFamilySpace(id = newId(), now = new Date().toISOString()): FamilySpace {
  return { schemaVersion: 1, familyId: id, mode: 'LOCAL_ONLY', members: [{ id: newId(), name: translate('family:members.defaultSelf'), profile: 'PARENT' }], events: [], reminders: [], emergencyContacts: [], sosQueue: [], updatedAt: now }
}

function parseDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const checked = new Date(timestamp)
  return checked.getUTCFullYear() === year && checked.getUTCMonth() + 1 === month && checked.getUTCDate() === day ? timestamp : null
}

export function occursOn(event: FamilyEvent, date: string): boolean {
  const first = parseDay(event.date)
  const current = parseDay(date)
  if (first === null || current === null || current < first) return false
  const firstDate = new Date(first)
  const currentDate = new Date(current)
  switch (event.recurrence) {
    case 'once': return current === first
    case 'daily': return true
    case 'weekly': return (current - first) % (7 * 86400000) === 0
    case 'monthly': return currentDate.getUTCDate() === firstDate.getUTCDate()
    case 'yearly': return currentDate.getUTCDate() === firstDate.getUTCDate() && currentDate.getUTCMonth() === firstDate.getUTCMonth()
  }
}

export function eventsForDate(space: FamilySpace, date: string, viewerId?: string): FamilyEvent[] {
  const viewer = viewerId ? space.members.find((member) => member.id === viewerId) : null
  return space.events.filter((event) => {
    if (!occursOn(event, date)) return false
    if (!viewer) return true
    // Mức riêng tư 'PRIVATE' theo cùng luật phạm vi riêng tư: chỉ người được gắn mới thấy, kể cả bố mẹ.
    if (event.scope === 'PRIVATE' || event.dataClass === 'PRIVATE') return event.memberIds.includes(viewer.id)
    if (event.scope === 'PARENTS_SENIORS' && viewer.profile === 'CHILD') return false
    if (event.scope === 'PARENTS_CHILDREN' && viewer.profile === 'SENIOR') return false
    return viewer.profile !== 'CHILD' || event.memberIds.includes(viewer.id) || event.scope === 'FAMILY_ALL'
  }).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'vi'))
}

/**
 * Mục được đưa ra ngoài (ICS, bản in) khi người dùng KHÔNG chọn "gồm cả riêng tư".
 * Một luật cho cả hai đường xuất: trước đây chỉ chặn `SENSITIVE` + phạm vi `PRIVATE`
 * nên mức riêng tư `PRIVATE` (dataClass) lọt ra cả lịch in lẫn tệp ICS.
 */
export function isShareable(event: FamilyEvent): boolean {
  return event.dataClass === 'NORMAL' && event.scope !== 'PRIVATE'
}

export function dateOffset(date: string, offset: number): string {
  const timestamp = parseDay(date)
  if (timestamp === null) throw new Error('Invalid date')
  return new Date(timestamp + offset * 86400000).toISOString().slice(0, 10)
}

function validShell(item: FamilySpace): boolean {
  return item.schemaVersion === 1 && typeof item.familyId === 'string' && /^[0-9a-f-]{36}$/i.test(item.familyId) && ['LOCAL_ONLY', 'FAMILY_SHARE', 'ACCOUNT_BACKED'].includes(item.mode) && Array.isArray(item.members) && Array.isArray(item.events) && Array.isArray(item.reminders) && Array.isArray(item.emergencyContacts) && Array.isArray(item.sosQueue)
}

const validMember = (member: FamilyMember, seen: Set<string>) =>
  Boolean(member) && typeof member.id === 'string' && !seen.has(member.id) && typeof member.name === 'string' && Boolean(member.name.trim()) && member.name.length <= 100 && ['PARENT', 'SENIOR', 'CHILD'].includes(member.profile)

const validEvent = (event: FamilyEvent, seen: Set<string>, memberIds: Set<string>) =>
  Boolean(event) && typeof event.id === 'string' && !seen.has(event.id) && typeof event.title === 'string' && Boolean(event.title.trim()) && event.title.length <= 300 && parseDay(event.date) !== null && typeof event.time === 'string' && (event.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) && typeof event.notes === 'string' && event.notes.length <= 10000 && ['school', 'appointment', 'deadline', 'medication', 'payment', 'task', 'other'].includes(event.category) && ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(event.recurrence) && ['FAMILY_ALL', 'PARENTS_SENIORS', 'PARENTS_CHILDREN', 'PRIVATE'].includes(event.scope) && ['NORMAL', 'PRIVATE', 'SENSITIVE'].includes(event.dataClass) && Array.isArray(event.memberIds) && event.memberIds.every((id) => memberIds.has(id)) && Array.isArray(event.completedDates) && event.completedDates.every((date) => parseDay(date) !== null)

const validReminder = (reminder: FamilyReminder, eventIds: Set<string>, memberIds: Set<string>) =>
  Boolean(reminder) && typeof reminder.id === 'string' && eventIds.has(reminder.eventId) && Number.isInteger(reminder.minutesBefore) && reminder.minutesBefore >= 0 && reminder.minutesBefore <= 1440 && Array.isArray(reminder.recipientMemberIds) && reminder.recipientMemberIds.every((id) => memberIds.has(id)) && typeof reminder.hideDetails === 'boolean'

const validContact = (contact: EmergencyContact) =>
  Boolean(contact) && typeof contact.id === 'string' && typeof contact.name === 'string' && Boolean(contact.name.trim()) && contact.name.length <= 100 && typeof contact.phone === 'string' && /^[+0-9().\s-]{3,30}$/.test(contact.phone)

const validSos = (sos: PendingSos) =>
  Boolean(sos) && typeof sos.id === 'string' && ['PENDING_LOCAL', 'SAFE'].includes(sos.status) && typeof sos.createdAt === 'string' && !Number.isNaN(Date.parse(sos.createdAt)) &&
  (!sos.lastKnown || (Number.isFinite(sos.lastKnown.latitude) && Math.abs(sos.lastKnown.latitude) <= 90 && Number.isFinite(sos.lastKnown.longitude) && Math.abs(sos.lastKnown.longitude) <= 180 && !Number.isNaN(Date.parse(sos.lastKnown.capturedAt))))

export function validateFamilySpace(value: unknown): FamilySpace | null {
  if (!value || typeof value !== 'object') return null
  const item = value as FamilySpace
  if (!validShell(item)) return null
  if (item.members.length > 100 || item.events.length > 10000 || item.reminders.length > 20000 || item.emergencyContacts.length > 100 || item.sosQueue.length > 1000) return null
  const memberIds = new Set<string>()
  for (const member of item.members) {
    if (!validMember(member, memberIds)) return null
    memberIds.add(member.id)
  }
  const eventIds = new Set<string>()
  for (const event of item.events) {
    if (!validEvent(event, eventIds, memberIds)) return null
    eventIds.add(event.id)
  }
  if (!item.reminders.every((reminder) => validReminder(reminder, eventIds, memberIds))) return null
  if (!item.emergencyContacts.every(validContact) || !item.sosQueue.every(validSos)) return null
  return item
}

/**
 * Cứu dữ liệu đọc từ máy / tệp sao lưu: bỏ RIÊNG từng mục hỏng thay vì vứt cả gia đình.
 * Trước đây một lịch hỏng là `validateFamilySpace` trả null và app lặng lẽ dựng không gian
 * trống mới — người dùng tưởng mất hết. Chỉ trả null khi phần khung (mã, phiên bản) hỏng.
 */
export function salvageFamilySpace(value: unknown): { space: FamilySpace; dropped: number } | null {
  if (!value || typeof value !== 'object') return null
  const item = value as FamilySpace
  if (!validShell(item)) return null
  const memberIds = new Set<string>()
  const members = item.members.slice(0, 100).filter((member) => { const ok = validMember(member, memberIds); if (ok) memberIds.add(member.id); return ok })
  if (!members.length) return null
  const eventIds = new Set<string>()
  const events = item.events.slice(0, 10000).map((event) => event && Array.isArray(event.memberIds) ? { ...event, memberIds: event.memberIds.filter((id) => memberIds.has(id)) } : event)
    .filter((event) => { const ok = validEvent(event, eventIds, memberIds); if (ok) eventIds.add(event.id); return ok })
  const reminders = item.reminders.slice(0, 20000).map((reminder) => reminder && Array.isArray(reminder.recipientMemberIds) ? { ...reminder, recipientMemberIds: reminder.recipientMemberIds.filter((id) => memberIds.has(id)) } : reminder)
    .filter((reminder) => validReminder(reminder, eventIds, memberIds))
  const emergencyContacts = item.emergencyContacts.slice(0, 100).filter(validContact)
  const sosQueue = item.sosQueue.slice(0, 1000).filter(validSos)
  const before = item.members.length + item.events.length + item.reminders.length + item.emergencyContacts.length + item.sosQueue.length
  const after = members.length + events.length + reminders.length + emergencyContacts.length + sosQueue.length
  return { space: { ...item, members, events, reminders, emergencyContacts, sosQueue }, dropped: before - after }
}
