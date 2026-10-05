import { describe, expect, it } from 'vitest'
import { createFamilySpace } from './family'
import { exportFamilyIcs, parseFamilyBackup } from './portability'

describe('family portability', () => {
  it('restores IDs while returning to local-only mode', () => {
    const original = createFamilySpace('11111111-1111-4111-8111-111111111111')
    const restored = parseFamilyBackup(JSON.stringify({ ...original, mode: 'ACCOUNT_BACKED' }))
    expect(restored?.familyId).toBe(original.familyId)
    expect(restored?.mode).toBe('LOCAL_ONLY')
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
