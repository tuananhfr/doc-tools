export interface InsuranceRates { social: number; health: number; unemployment: number }
export interface TaxBracket { upTo: number | null; rate: number }
export interface PayrollRules {
  selfDeduct: number
  dependentDeduct: number
  referenceSalary: number
  minWages: [number, number, number, number]
  employee: InsuranceRates
  employer: InsuranceRates
  brackets: TaxBracket[]
}
export interface PayrollOptions { dependents: number; region: 1 | 2 | 3 | 4; insuranceBase?: number; exempt: number }

export function validatePayrollRules(value: unknown): PayrollRules | null {
  if (!value || typeof value !== 'object') return null
  const item = value as PayrollRules
  const money = [item.selfDeduct, item.dependentDeduct, item.referenceSalary, ...(Array.isArray(item.minWages) ? item.minWages : [])]
  if (!Array.isArray(item.minWages) || item.minWages.length !== 4 || money.some((number) => !Number.isFinite(number) || number < 0 || number > 1e10) || item.referenceSalary === 0) return null
  for (const rates of [item.employee, item.employer]) if (!rates || [rates.social, rates.health, rates.unemployment].some((rate) => !Number.isFinite(rate) || rate < 0 || rate > 1)) return null
  if (!Array.isArray(item.brackets) || item.brackets.length < 1 || item.brackets.length > 20) return null
  let previous = 0
  for (const [index, bracket] of item.brackets.entries()) {
    if (!bracket || !Number.isFinite(bracket.rate) || bracket.rate < 0 || bracket.rate > 1) return null
    if (bracket.upTo === null) { if (index !== item.brackets.length - 1) return null }
    else if (!Number.isFinite(bracket.upTo) || bracket.upTo <= previous || bracket.upTo > 1e12) return null
    else previous = bracket.upTo
  }
  return item.brackets.at(-1)?.upTo === null ? item : null
}

export function grossToNet(gross: number, options: PayrollOptions, rules: PayrollRules) {
  if (!validatePayrollRules(rules) || !Number.isFinite(gross) || gross < 0 || gross > 1e12 || !Number.isInteger(options.dependents) || options.dependents < 0 || options.dependents > 100 || ![1, 2, 3, 4].includes(options.region) || !Number.isFinite(options.exempt) || options.exempt < 0 || options.exempt > gross || (options.insuranceBase !== undefined && (!Number.isFinite(options.insuranceBase) || options.insuranceBase < 0 || options.insuranceBase > 1e12))) return null
  const base = options.insuranceBase ?? gross
  const socialBase = Math.min(base, 20 * rules.referenceSalary)
  const unemploymentBase = Math.min(base, 20 * rules.minWages[options.region - 1])
  const employee = {
    social: Math.round(socialBase * rules.employee.social), health: Math.round(socialBase * rules.employee.health),
    unemployment: Math.round(unemploymentBase * rules.employee.unemployment),
  }
  const employer = {
    social: Math.round(socialBase * rules.employer.social), health: Math.round(socialBase * rules.employer.health),
    unemployment: Math.round(unemploymentBase * rules.employer.unemployment),
  }
  const employeeTotal = employee.social + employee.health + employee.unemployment
  const employerTotal = employer.social + employer.health + employer.unemployment
  const deduction = rules.selfDeduct + options.dependents * rules.dependentDeduct
  const taxable = Math.max(0, gross - options.exempt - employeeTotal - deduction)
  let previous = 0
  const taxRows = rules.brackets.map((bracket, index) => {
    const cap = bracket.upTo ?? taxable
    const part = Math.max(0, Math.min(taxable, cap) - previous)
    previous = cap
    return { level: index + 1, part, rate: bracket.rate, amount: part * bracket.rate }
  }).filter((row) => row.part > 0)
  const tax = Math.round(taxRows.reduce((sum, row) => sum + row.amount, 0))
  return { gross, net: gross - employeeTotal - tax, employee, employeeTotal, employer, employerTotal, deduction, taxable, taxRows, tax, employerCost: gross + employerTotal }
}

export function netToGross(net: number, options: PayrollOptions, rules: PayrollRules) {
  if (!Number.isFinite(net) || net < 0 || net > 1e12) return null
  let low = 0
  let high = Math.min(1e12, net * 4 + 50_000_000)
  if ((grossToNet(high, options, rules)?.net ?? -1) < net) return null
  for (let index = 0; index < 60; index++) {
    const middle = Math.floor((low + high) / 2)
    if ((grossToNet(middle, options, rules)?.net ?? -1) < net) low = middle + 1
    else high = middle
  }
  return grossToNet(high, options, rules)
}
