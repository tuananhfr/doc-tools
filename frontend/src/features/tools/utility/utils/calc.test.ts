import { describe, expect, it } from 'vitest'
import { CALC_FORMULAS, type CalcFormula } from '../config/calc-formulas'
import { evaluateFormula, formatResult } from './calc'
import { convertToAll, convertUnit, findUnit } from './unit-convert'
import { UNIT_GROUPS } from '../config/units'

const formula = (id: string): CalcFormula => {
  const found = CALC_FORMULAS.find((item) => item.id === id)
  if (!found) throw new Error(`không có công thức ${id}`)
  return found
}

const value = (id: string, texts: Record<string, string>, quantity = '') => {
  const outcome = evaluateFormula(formula(id), texts, quantity)
  if (!outcome.ok) throw new Error(`phải tính được ${id}`)
  return outcome
}

describe('evaluateFormula', () => {
  it('tính diện tích các hình', () => {
    expect(value('rectangle', { a: '12,5', b: '4' }).value).toBeCloseTo(50, 10)
    expect(value('triangle', { a: '6', h: '3' }).value).toBeCloseTo(9, 10)
    expect(value('trapezoid', { a: '8', b: '4', h: '2,5' }).value).toBeCloseTo(15, 10)
    expect(value('circle', { d: '2' }).value).toBeCloseTo(Math.PI, 10)
  })

  it('tính thể tích', () => {
    expect(value('box', { a: '6', b: '0,3', h: '0,5' }).value).toBeCloseTo(0.9, 10)
    expect(value('cylinder', { d: '0,4', h: '3' }).value).toBeCloseTo(0.376991, 5)
  })

  it('tính khối lượng thép khớp bảng tra', () => {
    // Bảng tra: D10 = 0,617 kg/m; D16 = 1,58 kg/m; D25 = 3,85 kg/m.
    expect(value('rebar', { d: '10', l: '1' }).value).toBeCloseTo(0.617, 3)
    expect(value('rebar', { d: '16', l: '11,7' }).value).toBeCloseTo(1.578 * 11.7, 1)
    expect(value('rebar', { d: '25', l: '1' }).value).toBeCloseTo(3.853, 3)
    // Tấm 1,5 m × 6 m dày 10 mm = 0,09 m³ × 7.850.
    expect(value('plate', { a: '6', b: '1,5', t: '10' }).value).toBeCloseTo(706.5, 6)
    expect(value('density', { v: '2', p: '2500' }).value).toBe(5000)
  })

  it('nhân số lượng và in lại phép tính bằng số đã hiểu', () => {
    const outcome = value('rectangle', { a: '1.500', b: '2' }, '3')
    // Một dấu chấm đứng riêng là dấu thập phân: 1,5 chứ không phải 1.500.
    expect(outcome.single).toBeCloseTo(3, 10)
    expect(outcome.value).toBeCloseTo(9, 10)
    expect(outcome.expression).toBe('1,5 × 2 × 3')
    expect(value('trapezoid', { a: '8', b: '4', h: '2' }, '2').expression).toBe('(8 + 4) ÷ 2 × 2 × 2')
    expect(value('rectangle', { a: '2', b: '3' }).expression).toBe('2 × 3')
  })

  it('ô trống không phải lỗi, ô sai thì chỉ ra', () => {
    expect(evaluateFormula(formula('rectangle'), { a: '2' }, '')).toEqual({ ok: false, invalid: [] })
    expect(evaluateFormula(formula('rectangle'), { a: 'hai', b: '-3' }, '')).toEqual({ ok: false, invalid: ['a', 'b'] })
    expect(evaluateFormula(formula('rectangle'), { a: '2', b: '0' }, '')).toEqual({ ok: false, invalid: ['b'] })
    expect(evaluateFormula(formula('rectangle'), { a: '2', b: '3' }, 'x')).toEqual({ ok: false, invalid: ['quantity'] })
  })

  it('mọi công thức đều khai đủ ô mà nó dùng', () => {
    for (const item of CALC_FORMULAS) {
      const texts = Object.fromEntries(item.inputs.map((input) => [input.key, '2']))
      const outcome = evaluateFormula(item, texts, '')
      expect(outcome.ok, item.id).toBe(true)
      if (outcome.ok) expect(outcome.expression, item.id).not.toContain('undefined')
    }
  })
})

describe('formatResult', () => {
  it('giữ ba chữ số thập phân cho số từ 1 trở lên, không cắt phần nguyên', () => {
    expect(formatResult(4431.967907)).toBe('4.431,968')
    expect(formatResult(12345678.4)).toBe('12.345.678,4')
    expect(formatResult(50)).toBe('50')
    expect(formatResult(Math.PI)).toBe('3,142')
  })

  it('giữ bốn chữ số có nghĩa cho số nhỏ hơn 1', () => {
    expect(formatResult(0.376991)).toBe('0,377')
    expect(formatResult(0.000785398)).toBe('0,0007854')
    expect(formatResult(-0)).toBe('0')
    expect(formatResult(Number.NaN)).toBe('—')
  })
})

describe('convertUnit', () => {
  const group = (id: string) => {
    const found = UNIT_GROUPS.find((item) => item.id === id)
    if (!found) throw new Error(`không có nhóm ${id}`)
    return found
  }
  const convert = (groupId: string, amount: number, from: string, to: string) => convertUnit(amount, findUnit(group(groupId), from), findUnit(group(groupId), to))

  it('đổi chiều dài theo định nghĩa chính xác', () => {
    expect(convert('length', 1, 'ft', 'in')).toBeCloseTo(12, 10)
    expect(convert('length', 1, 'in', 'mm')).toBeCloseTo(25.4, 10)
    expect(convert('length', 1, 'mi', 'km')).toBeCloseTo(1.609344, 10)
    expect(convert('length', 2500, 'mm', 'm')).toBeCloseTo(2.5, 10)
    expect(convert('length', 1, 'yd', 'ft')).toBeCloseTo(3, 10)
  })

  it('đổi diện tích và khối lượng', () => {
    expect(convert('area', 1, 'ha', 'm2')).toBe(10_000)
    expect(convert('area', 1, 'ac', 'm2')).toBeCloseTo(4046.8564224, 6)
    expect(convert('area', 100, 'ft2', 'm2')).toBeCloseTo(9.290304, 8)
    expect(convert('mass', 1, 't', 'kg')).toBe(1000)
    expect(convert('mass', 3, 'ta', 'yen')).toBe(30)
    expect(convert('mass', 1, 'lb', 'oz')).toBeCloseTo(16, 10)
  })

  it('đổi sang mọi đơn vị của nhóm, giữ thứ tự khai báo', () => {
    const length = group('length')
    const all = convertToAll(1, findUnit(length, 'm'), length)
    expect(all.map((item) => item.unit.id)).toEqual(length.units.map((unit) => unit.id))
    expect(all.find((item) => item.unit.id === 'cm')?.value).toBe(100)
  })

  it('cặp đơn vị mặc định của mỗi nhóm đều tồn tại', () => {
    for (const item of UNIT_GROUPS) {
      const ids = item.units.map((unit) => unit.id)
      expect(ids).toContain(item.from)
      expect(ids).toContain(item.to)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
