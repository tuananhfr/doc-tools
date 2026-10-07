import { translate } from '@/i18n/runtime'

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

export function createFamilySpace(id = crypto.randomUUID(), now = new Date().toISOString()): FamilySpace {
  return { schemaVersion: 1, familyId: id, mode: 'LOCAL_ONLY', members: [{ id: crypto.randomUUID(), name: translate('family:members.defaultSelf'), profile: 'PARENT' }], events: [], reminders: [], emergencyContacts: [], sosQueue: [], updatedAt: now }
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
    if (event.scope === 'PRIVATE') return event.memberIds.includes(viewer.id)
    if (event.scope === 'PARENTS_SENIORS' && viewer.profile === 'CHILD') return false
    if (event.scope === 'PARENTS_CHILDREN' && viewer.profile === 'SENIOR') return false
    return viewer.profile !== 'CHILD' || event.memberIds.includes(viewer.id) || event.scope === 'FAMILY_ALL'
  }).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'vi'))
}

export function dateOffset(date: string, offset: number): string {
  const timestamp = parseDay(date)
  if (timestamp === null) throw new Error('Invalid date')
  return new Date(timestamp + offset * 86400000).toISOString().slice(0, 10)
}

export function validateFamilySpace(value: unknown): FamilySpace | null {
  if (!value || typeof value !== 'object') return null
  const item = value as FamilySpace
  if (item.schemaVersion !== 1 || typeof item.familyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.familyId) || !['LOCAL_ONLY', 'FAMILY_SHARE', 'ACCOUNT_BACKED'].includes(item.mode) || !Array.isArray(item.members) || !Array.isArray(item.events) || !Array.isArray(item.reminders) || !Array.isArray(item.emergencyContacts) || !Array.isArray(item.sosQueue)) return null
  if (item.members.length > 100 || item.events.length > 10000 || item.reminders.length > 20000 || item.emergencyContacts.length > 100 || item.sosQueue.length > 1000) return null
  const memberIds = new Set<string>()
  for (const member of item.members) {
    if (!member || typeof member.id !== 'string' || memberIds.has(member.id) || typeof member.name !== 'string' || !member.name.trim() || member.name.length > 100 || !['PARENT', 'SENIOR', 'CHILD'].includes(member.profile)) return null
    memberIds.add(member.id)
  }
  const eventIds = new Set<string>()
  for (const event of item.events) {
    if (!event || typeof event.id !== 'string' || eventIds.has(event.id) || typeof event.title !== 'string' || !event.title.trim() || event.title.length > 300 || parseDay(event.date) === null || typeof event.time !== 'string' || (event.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) || typeof event.notes !== 'string' || event.notes.length > 10000 || !['school', 'appointment', 'deadline', 'medication', 'payment', 'task', 'other'].includes(event.category) || !['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(event.recurrence) || !['FAMILY_ALL', 'PARENTS_SENIORS', 'PARENTS_CHILDREN', 'PRIVATE'].includes(event.scope) || !['NORMAL', 'PRIVATE', 'SENSITIVE'].includes(event.dataClass) || !Array.isArray(event.memberIds) || event.memberIds.some((id) => !memberIds.has(id)) || !Array.isArray(event.completedDates) || event.completedDates.some((date) => parseDay(date) === null)) return null
    eventIds.add(event.id)
  }
  for (const reminder of item.reminders) if (!reminder || typeof reminder.id !== 'string' || !eventIds.has(reminder.eventId) || !Number.isInteger(reminder.minutesBefore) || reminder.minutesBefore < 0 || reminder.minutesBefore > 1440 || !Array.isArray(reminder.recipientMemberIds) || reminder.recipientMemberIds.some((id) => !memberIds.has(id)) || typeof reminder.hideDetails !== 'boolean') return null
  for (const contact of item.emergencyContacts) if (!contact || typeof contact.id !== 'string' || typeof contact.name !== 'string' || !contact.name.trim() || contact.name.length > 100 || typeof contact.phone !== 'string' || !/^[+0-9().\s-]{3,30}$/.test(contact.phone)) return null
  for (const sos of item.sosQueue) {
    if (!sos || typeof sos.id !== 'string' || !['PENDING_LOCAL', 'SAFE'].includes(sos.status) || typeof sos.createdAt !== 'string' || Number.isNaN(Date.parse(sos.createdAt))) return null
    if (sos.lastKnown && (!Number.isFinite(sos.lastKnown.latitude) || Math.abs(sos.lastKnown.latitude) > 90 || !Number.isFinite(sos.lastKnown.longitude) || Math.abs(sos.lastKnown.longitude) > 180 || Number.isNaN(Date.parse(sos.lastKnown.capturedAt)))) return null
  }
  return item
}
