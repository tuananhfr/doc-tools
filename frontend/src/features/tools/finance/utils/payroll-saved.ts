import { isRecord, stringAt, stringsAt } from '@/utils/saved-payload'

export interface PayrollInput<F extends string> {
  mode: 'gross' | 'net'
  salary: string
  dependents: string
  region: 1 | 2 | 3 | 4
  insuranceBase: string
  exempt: string
  fields: Record<F, string>
  bracketText: string
}

const SHORT = 40
const BRACKETS = 5_000

export function payrollSnapshot<F extends string>(input: PayrollInput<F>): Record<string, unknown> | null {
  return input.salary === '' ? null : { v: 1, ...input, fields: { ...input.fields } }
}

/** `ruleFields` is the page's list, so a payload from an older field set is refused, not half-applied. */
export function parsePayrollSaved<F extends string>(payload: unknown, ruleFields: readonly F[]): PayrollInput<F> | null {
  if (!isRecord(payload) || payload.v !== 1 || (payload.mode !== 'gross' && payload.mode !== 'net') || !isRecord(payload.fields)) return null
  if (payload.region !== 1 && payload.region !== 2 && payload.region !== 3 && payload.region !== 4) return null
  const values = stringsAt(payload, ['salary', 'dependents', 'insuranceBase', 'exempt'], SHORT)
  const fields = stringsAt(payload.fields, ruleFields, SHORT)
  const bracketText = stringAt(payload, 'bracketText', BRACKETS)
  return values && fields && bracketText !== null ? { mode: payload.mode, region: payload.region, ...values, fields, bracketText } : null
}
