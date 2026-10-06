import { describe, expect, it } from 'vitest'
import { CURRENT_RULE_PROFILE, RULE_PROFILES } from '../config/rule-profiles'
import type { PersonProfile, RuleProfile } from '../types/rule.types'
import { goodDirections, kuaNumber, readDirection, readHouse, readPerson, validateProfile } from './rule-engine'

const batTrach = RULE_PROFILES[0]
const person = (year: number, sex: PersonProfile['sex']): PersonProfile => ({ id: 'p', label: 'A', year, sex })

describe('kuaNumber', () => {
  it.each([
    [1990, 'MALE', 1],
    [1990, 'FEMALE', 8],
    [1984, 'MALE', 7],
    [1984, 'FEMALE', 8],
    [1986, 'MALE', 2], // ra 5 → nam lấy Khôn
    [1987, 'FEMALE', 2],
    [2000, 'MALE', 9],
    [2000, 'FEMALE', 6],
    [1981, 'FEMALE', 8], // ra 5 → nữ lấy Cấn
    [1977, 'FEMALE', 1],
  ] as const)('%i %s → quái %i', (year, sex, expected) => {
    expect(kuaNumber(batTrach, year, sex)).toBe(expected)
  })
})

describe('bảng Bát trạch', () => {
  it('bộ luật hợp lệ: mỗi quái là một hoán vị đủ 8 hướng', () => {
    expect(validateProfile(batTrach)).toBeNull()
  })

  it('Đông tứ mệnh tốt ở Bắc / Nam / Đông / Đông Nam, Tây tứ mệnh ở 4 hướng còn lại', () => {
    for (const trigram of batTrach.trigrams) {
      const good = Object.entries(trigram.stars)
        .filter(([id]) => batTrach.stars.find((star) => star.id === id)?.fortune === 'GOOD')
        .map(([, index]) => index)
        .sort()
      expect(good).toEqual(trigram.group === 'EAST' ? [0, 2, 3, 4] : [1, 5, 6, 7])
    }
  })

  it('các cặp sao đối xứng: quái A thấy quái B ở sao X thì B thấy A cũng ở sao X', () => {
    // Quái số → chỉ số hướng của chính nó (hậu thiên bát quái).
    const home: Record<number, number> = { 1: 0, 2: 5, 3: 2, 4: 3, 6: 7, 7: 6, 8: 1, 9: 4 }
    const byHome = Object.fromEntries(Object.entries(home).map(([number, index]) => [index, Number(number)]))
    for (const trigram of batTrach.trigrams) {
      for (const [star, index] of Object.entries(trigram.stars)) {
        const other = batTrach.trigrams.find((item) => item.number === byHome[index])!
        expect(other.stars[star]).toBe(home[trigram.number])
      }
    }
  })
})

describe('readPerson / readDirection', () => {
  it('nam 1990 (Khảm): Đông Nam là Sinh khí, Tây Nam là Tuyệt mệnh', () => {
    const reading = readPerson(batTrach, person(1990, 'MALE'))
    expect(reading.ok).toBe(true)
    if (!reading.ok) return
    expect(reading.value.trigram.name).toBe('Khảm')
    expect(reading.value.group.name).toBe('Đông tứ mệnh')
    expect(readDirection(reading.value, 132).star.name).toBe('Sinh khí')
    expect(readDirection(reading.value, 225).star.name).toBe('Tuyệt mệnh')
    expect(goodDirections(reading.value).map((segment) => segment.name)).toEqual(['Đông Nam', 'Đông', 'Nam', 'Bắc'])
  })

  it('năm ngoài khoảng bị từ chối, không đoán', () => {
    expect(readPerson(batTrach, person(1850, 'MALE')).ok).toBe(false)
  })

  it('bộ luật hỏng → báo lỗi ở phần theo tuổi, không ném — ORI-010', () => {
    const broken: RuleProfile = { ...batTrach, trigrams: batTrach.trigrams.map((item, index) => (index === 0 ? { ...item, stars: { ...item.stars, SINH_KHI: 0 } } : item)) }
    const reading = readPerson(broken, person(1990, 'MALE'))
    expect(reading).toMatchObject({ ok: false })
  })
})

describe('bộ luật v1.1.0', () => {
  const current = CURRENT_RULE_PROFILE

  it('là mục cuối, hợp lệ, bảng sao và cung phi giữ nguyên v1.0.0', () => {
    expect(current.version).toBe('1.1.0')
    expect(validateProfile(current)).toBeNull()
    expect(current.kua).toEqual(batTrach.kua)
    expect(current.trigrams.map(({ home: _home, ...rest }) => rest)).toEqual(batTrach.trigrams)
    expect(current.yearBoundary).toBe('TET')
  })

  it('hướng hậu thiên sai → báo lỗi ở phần theo tuổi', () => {
    const broken: RuleProfile = { ...current, trigrams: current.trigrams.map((item, index) => (index === 0 ? { ...item, home: 5 } : item)) }
    expect(validateProfile(broken)).not.toBeNull()
  })
})

describe('readHouse', () => {
  const read = (year: number, sex: PersonProfile['sex']) => {
    const outcome = readPerson(CURRENT_RULE_PROFILE, person(year, sex))
    if (!outcome.ok) throw new Error(outcome.reason)
    return outcome.value
  }

  it('ảnh mẫu: nam 1986 (Khôn), hướng 178,4° Nam là Lục sát; toạ Bắc là Khảm trạch, không hợp Tây tứ mệnh', () => {
    const house = readHouse(CURRENT_RULE_PROFILE, read(1986, 'MALE'), 178.4)
    expect(house.facing).toMatchObject({ segment: 'Nam', star: { name: 'Lục sát', fortune: 'BAD' } })
    expect(house.house).toMatchObject({ segment: 'Bắc', trigram: { name: 'Khảm' }, group: { id: 'EAST' }, matchesPerson: false })
  })

  it('hai cách có thể vênh: người Khảm, nhà hướng Đông — sao Thiên y nhưng toạ Tây là Tây tứ trạch', () => {
    const house = readHouse(CURRENT_RULE_PROFILE, read(1990, 'MALE'), 90)
    expect(house.facing.star.name).toBe('Thiên y')
    expect(house.house).toMatchObject({ trigram: { name: 'Đoài' }, matchesPerson: false })
  })

  it('bộ luật v1.0.0 không có hướng hậu thiên → chỉ có sao tại hướng', () => {
    const outcome = readPerson(batTrach, person(1986, 'MALE'))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(readHouse(batTrach, outcome.value, 180).house).toBeNull()
  })
})
