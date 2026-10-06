import { describe, expect, it } from 'vitest'
import { MOUNTAINS } from '../config/luopan'
import { mountainOf, sittingOf } from './luopan'

describe('24 sơn', () => {
  it('đủ 24 sơn, mỗi hướng ba sơn, tên khớp la bàn', () => {
    expect(MOUNTAINS).toHaveLength(24)
    const bySector = (sector: number) => MOUNTAINS.filter((item) => item.sector === sector).map((item) => item.name)
    expect(bySector(0)).toEqual(['Tý', 'Quý', 'Nhâm'])
    expect(bySector(4)).toEqual(['Bính', 'Ngọ', 'Đinh'])
    expect(bySector(5)).toEqual(['Mùi', 'Khôn', 'Thân'])
    expect(bySector(7)).toEqual(['Tuất', 'Càn', 'Hợi'])
  })

  it('ảnh mẫu: hướng 178,4° là Ngọ, toạ 358,4° là Tý; lệch tâm về phía Bính', () => {
    const facing = mountainOf(178.4)
    expect(facing.mountain.name).toBe('Ngọ')
    expect(facing.offset).toBeCloseTo(-1.6, 6)
    expect(facing.toward?.name).toBe('Bính')
    expect(facing.void).toBeNull()
    expect(sittingOf(178.4)).toBeCloseTo(358.4, 6)
    expect(mountainOf(sittingOf(178.4)).mountain.name).toBe('Tý')
  })

  it('Nhâm trùm 337,5°–352,5°; góc đúng ranh thuộc sơn kế tiếp', () => {
    expect(mountainOf(337.5).mountain.name).toBe('Nhâm')
    expect(mountainOf(337.49).mountain.name).toBe('Hợi')
    expect(mountainOf(352.5).mountain.name).toBe('Tý')
    expect(mountainOf(7.5).mountain.name).toBe('Quý')
    expect(mountainOf(-10).mountain.name).toBe('Nhâm')
  })

  it('đúng tâm thì không lệch về đâu', () => {
    expect(mountainOf(180)).toMatchObject({ offset: 0, toward: null, void: null })
  })

  it('không vong: sát ranh hai hướng là đại, sát ranh hai sơn là tiểu, cửa sổ ±1,5°', () => {
    expect(mountainOf(22.5).void).toBe('MAJOR')
    expect(mountainOf(21).void).toBe('MAJOR')
    expect(mountainOf(24).void).toBe('MAJOR')
    expect(mountainOf(20.9).void).toBeNull()
    expect(mountainOf(37.5).void).toBe('MINOR')
    expect(mountainOf(7.5).void).toBe('MINOR')
    expect(mountainOf(337.5).void).toBe('MAJOR')
    expect(mountainOf(45).void).toBeNull()
  })
})
