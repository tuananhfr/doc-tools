import { describe, expect, it } from 'vitest'
import { createFamilySpace } from './family'
import { exportFamilyIcs, foldIcsLine, parseFamilyBackup } from './portability'

describe('family portability', () => {
  it('restores IDs while returning to local-only mode', () => {
    const original = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const restored = parseFamilyBackup(JSON.stringify({ ...original, mode: 'ACCOUNT_BACKED' }))
    expect(restored?.space.familyId).toBe(original.familyId)
    expect(restored?.space.mode).toBe('LOCAL_ONLY')
    expect(restored?.dropped).toBe(0)
  })
  it('restores a backup with one damaged entry instead of rejecting all of it', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const good = { id: 'event-1', title: 'Đi chợ', date: '2026-10-05', time: '', notes: '', category: 'task', recurrence: 'once', scope: 'FAMILY_ALL', dataClass: 'NORMAL', memberIds: [], completedDates: [], createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' }
    const restored = parseFamilyBackup(JSON.stringify({ ...space, events: [good, { ...good, id: 'event-2', date: '2026-13-40' }] }))
    expect(restored?.space.events.map((event) => event.id)).toEqual(['event-1'])
    expect(restored?.dropped).toBe(1)
  })
  it('keeps PRIVATE privacy level out of ICS and declares the Vietnam time zone', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const base = { id: 'event-1', date: '2026-10-05', time: '09:00', notes: '', category: 'task' as const, recurrence: 'once' as const, scope: 'FAMILY_ALL' as const, memberIds: [], completedDates: [], createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' }
    space.events = [{ ...base, title: 'Việc chung', dataClass: 'NORMAL' }, { ...base, id: 'event-2', title: 'Quà bí mật', dataClass: 'PRIVATE' }]
    const result = exportFamilyIcs(space)
    expect(result).not.toContain('Quà bí mật')
    expect(result).toContain('BEGIN:VTIMEZONE\r\nTZID:Asia/Ho_Chi_Minh')
  })
  it('folds long lines at 75 bytes without splitting a Vietnamese character', () => {
    const line = `SUMMARY:${'Họp phụ huynh lớp 5A '.repeat(8)}`
    const folded = foldIcsLine(line).split('\r\n')
    expect(folded.length).toBeGreaterThan(1)
    for (const part of folded) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.map((part, index) => index ? part.slice(1) : part).join('')).toBe(line)
  })
  it('omits private entries from ICS by default', () => {
    const space = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const base = { id: 'event-1', date: '2026-10-05', time: '09:00', notes: '', category: 'task' as const, recurrence: 'weekly' as const, dataClass: 'NORMAL' as const, memberIds: [space.members[0].id], completedDates: [], createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z' }
    space.events = [{ ...base, title: 'Việc chung, tuần', scope: 'FAMILY_ALL' }, { ...base, id: 'event-2', title: 'Riêng tư', scope: 'PRIVATE' }]
    const result = exportFamilyIcs(space)
    expect(result).toContain('RRULE:FREQ=WEEKLY')
    expect(result).toContain('Việc chung\\, tuần')
    expect(result).not.toContain('Riêng tư')
    expect(exportFamilyIcs(space, true)).toContain('Riêng tư')
  })
})
