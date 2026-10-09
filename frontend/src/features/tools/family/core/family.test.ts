import { describe, expect, it } from 'vitest'
import { createFamilySpace, dateOffset, eventsForDate, isShareable, occursOn, salvageFamilySpace, validateFamilySpace, type FamilyEvent } from './family'

const event: FamilyEvent = { id: 'event-1', title: 'Nhắc lịch', date: '2024-02-29', time: '08:00', notes: '', category: 'appointment', recurrence: 'yearly', scope: 'PRIVATE', dataClass: 'NORMAL', memberIds: [], completedDates: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }

describe('family core', () => {
  it('keeps IDs and creates an account-free space', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    expect(space.mode).toBe('LOCAL_ONLY')
    expect(validateFamilySpace(space)).not.toBeNull()
  })
  it('handles recurrence without inventing February 29', () => {
    expect(occursOn(event, '2025-02-28')).toBe(false)
    expect(occursOn(event, '2028-02-29')).toBe(true)
    expect(occursOn({ ...event, recurrence: 'monthly' }, '2024-03-29')).toBe(true)
    expect(dateOffset('2024-02-28', 1)).toBe('2024-02-29')
  })
  it('rejects broken backups and orphan reminders', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    expect(validateFamilySpace({ ...space, reminders: [{ id: 'r', eventId: 'missing', minutesBefore: 10, recipientMemberIds: [], hideDetails: true }] })).toBeNull()
    expect(validateFamilySpace({ ...space, schemaVersion: 2 })).toBeNull()
  })
  it('salvages a space by dropping only the damaged items', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const memberId = space.members[0].id
    const ok = { ...event, id: 'ok', memberIds: [memberId, 'gone'] }
    const result = salvageFamilySpace({ ...space, events: [ok, { ...event, id: 'bad', title: '' }], reminders: [{ id: 'r', eventId: 'bad', minutesBefore: 10, recipientMemberIds: [], hideDetails: true }] })
    expect(result?.space.events.map((item) => item.id)).toEqual(['ok'])
    expect(result?.space.events[0].memberIds).toEqual([memberId])
    expect(result?.dropped).toBe(2)
    expect(validateFamilySpace(result?.space)).not.toBeNull()
    expect(salvageFamilySpace({ ...space, familyId: 'x' })).toBeNull()
  })
  it('shows a PRIVATE-level entry only to its tagged member', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const owner = space.members[0]
    const other = { id: 'other', name: 'Mẹ', profile: 'PARENT' as const }
    const entry = { ...event, date: '2026-10-09', recurrence: 'once' as const, scope: 'FAMILY_ALL' as const, dataClass: 'PRIVATE' as const, memberIds: [owner.id] }
    const withEntry = { ...space, members: [owner, other], events: [entry] }
    expect(eventsForDate(withEntry, '2026-10-09', owner.id)).toHaveLength(1)
    expect(eventsForDate(withEntry, '2026-10-09', other.id)).toHaveLength(0)
  })
  it('shares only normal, non-private entries', () => {
    expect(isShareable({ ...event, scope: 'FAMILY_ALL' })).toBe(true)
    expect(isShareable({ ...event, scope: 'FAMILY_ALL', dataClass: 'PRIVATE' })).toBe(false)
    expect(isShareable({ ...event, scope: 'FAMILY_ALL', dataClass: 'SENSITIVE' })).toBe(false)
    expect(isShareable(event)).toBe(false)
  })
})
