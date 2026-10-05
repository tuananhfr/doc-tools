import { describe, expect, it } from 'vitest'
import { createFamilySpace, dateOffset, occursOn, validateFamilySpace, type FamilyEvent } from './family'

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
})
