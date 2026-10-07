import { describe, expect, it } from 'vitest'
import { electricitySnapshot, parseElectricitySaved, type ElectricityInput } from './electricity-saved'
import { parsePayrollSaved, payrollSnapshot } from './payroll-saved'

const electricity: ElectricityInput = { mode: 'electricity', kwh: '350', households: '1', vat: '8', lines: '50,1806\n*,3000', water: { cubicMeters: '', price: '', fee: '0', vat: '0' } }

describe('electricity saved state', () => {
  it('round-trips through JSON and skips an empty form', () => {
    const payload = JSON.parse(JSON.stringify(electricitySnapshot(electricity)))
    expect(parseElectricitySaved(payload)).toEqual(electricity)
    expect(electricitySnapshot({ ...electricity, kwh: '', lines: ' ' })).toBeNull()
    expect(electricitySnapshot({ ...electricity, mode: 'water', water: { ...electricity.water, cubicMeters: '12' } })).not.toBeNull()
  })

  it('refuses payloads it did not write', () => {
    const good = electricitySnapshot(electricity)!
    for (const bad of [null, [], 'x', { ...good, v: 2 }, { ...good, mode: 'gas' }, { ...good, kwh: 350 }, { ...good, water: null }, { ...good, water: { ...electricity.water, fee: 1 } }, { ...good, lines: 'x'.repeat(20_001) }]) {
      expect(parseElectricitySaved(bad)).toBeNull()
    }
  })
})

describe('payroll saved state', () => {
  const FIELDS = ['selfDeduct', 'dependentDeduct'] as const
  const input = { mode: 'net' as const, salary: '20000000', dependents: '1', region: 2 as const, insuranceBase: '', exempt: '0', fields: { selfDeduct: '11000000', dependentDeduct: '4400000' }, bracketText: '*,5' }

  it('round-trips and needs a salary', () => {
    expect(parsePayrollSaved(JSON.parse(JSON.stringify(payrollSnapshot(input))), FIELDS)).toEqual(input)
    expect(payrollSnapshot({ ...input, salary: '' })).toBeNull()
  })

  it('refuses another field set, region or mode', () => {
    const good = payrollSnapshot(input)!
    expect(parsePayrollSaved(good, [...FIELDS, 'referenceSalary'])).toBeNull()
    for (const bad of [{ ...good, region: 5 }, { ...good, region: '1' }, { ...good, mode: 'both' }, { ...good, fields: [] }, { ...good, salary: null }]) {
      expect(parsePayrollSaved(bad, FIELDS)).toBeNull()
    }
  })
})
