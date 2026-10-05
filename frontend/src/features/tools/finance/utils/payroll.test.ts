import { describe, expect, it } from 'vitest'
import { grossToNet, netToGross, validatePayrollRules, type PayrollRules } from './payroll'

const rules: PayrollRules = {
  selfDeduct: 10_000_000, dependentDeduct: 4_000_000, referenceSalary: 2_000_000,
  minWages: [5_000_000, 4_500_000, 4_000_000, 3_500_000],
  employee: { social: .08, health: .015, unemployment: .01 }, employer: { social: .175, health: .03, unemployment: .01 },
  brackets: [{ upTo: 10_000_000, rate: .05 }, { upTo: null, rate: .1 }],
}

describe('payroll calculation', () => {
  it('applies insurance caps, deductions and progressive tax', () => {
    const result = grossToNet(30_000_000, { dependents: 1, region: 1, exempt: 0 }, rules)
    expect(result?.employeeTotal).toBe(3_150_000)
    expect(result?.taxable).toBe(12_850_000)
    expect(result?.tax).toBe(785_000)
    expect(result?.net).toBe(26_065_000)
  })
  it('finds the minimum gross that reaches a target net', () => {
    const options = { dependents: 0, region: 1 as const, exempt: 0 }
    const target = 25_000_000
    const result = netToGross(target, options, rules)
    expect(result?.net).toBeGreaterThanOrEqual(target)
    expect(grossToNet((result?.gross ?? 1) - 1, options, rules)?.net).toBeLessThan(target)
  })
  it('rejects incomplete or invalid rule packages', () => {
    expect(validatePayrollRules({ ...rules, brackets: [{ upTo: 10_000_000, rate: .05 }] })).toBeNull()
    expect(grossToNet(-1, { dependents: 0, region: 1, exempt: 0 }, rules)).toBeNull()
  })
})
