import { describe, expect, it } from 'vitest'
import { initialOrientation, orientationReducer } from './orientation-state'
import { orientationRecord, unitVector } from './orientation-record'

describe('unitVector', () => {
  it('đổi số độ sang vectơ Đông–Bắc', () => {
    expect(unitVector(0)).toEqual({ east: 0, north: 1 })
    expect(unitVector(90)).toEqual({ east: 1, north: 0 })
    expect(unitVector(180)).toEqual({ east: 0, north: -1 })
    expect(unitVector(270)).toEqual({ east: -1, north: 0 })
    expect(Object.is(unitVector(180).east, -0)).toBe(false)
  })
})

describe('orientationRecord', () => {
  const now = new Date('2026-10-04T03:00:00Z')

  it('chưa đo thì không có đối tượng nào, sai số là null chứ không phải 0', () => {
    const record = orientationRecord(initialOrientation(null), { kind: 'none' }, now)
    expect(record.targets).toEqual([])
    expect(record.accuracy).toBeNull()
    expect(record.file).toEqual({ kind: 'none', name: null, page: null })
  })

  it('ghi số độ, hướng, vectơ và nguồn của số nhập tay', () => {
    let state = orientationReducer(initialOrientation(null), { type: 'method', method: 'MANUAL' })
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: 135, source: 'MANUAL' })
    const record = orientationRecord(state, null, now)
    expect(record.source).toBe('MANUAL')
    expect(record.northReference).toBe('MAGNETIC')
    expect(record.measuredAt).toBe('2026-10-04T03:00:00.000Z')
    expect(record.targets).toHaveLength(1)
    expect(record.targets[0]).toMatchObject({ type: 'HOUSE_FRONTAGE', azimuth: 135, direction: 'Đông Nam' })
    expect(record.targets[0].vector.east).toBeCloseTo(Math.SQRT1_2, 5)
    expect(record.targets[0].vector.north).toBeCloseTo(-Math.SQRT1_2, 5)
  })

  it('không bao giờ chứa dữ liệu theo tuổi', () => {
    const record = orientationRecord(initialOrientation(null), null, now)
    expect(JSON.stringify(record)).not.toMatch(/year|sex|kua/i)
  })
})
