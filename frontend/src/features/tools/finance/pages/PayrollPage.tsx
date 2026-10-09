import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { formatRuleDate, ruleSnapshot } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { SaveResultBar, type SaveAdapter } from '@/features/cloud'
import { parsePayrollSaved, payrollSnapshot } from '../utils/payroll-saved'
import { grossToNet, netToGross, validatePayrollRules, type PayrollRules } from '../utils/payroll'
import { formatRuleLines, parseRuleLines } from '../utils/rule-lines'

type RuleField = 'selfDeduct' | 'dependentDeduct' | 'referenceSalary' | 'minWage1' | 'minWage2' | 'minWage3' | 'minWage4' | 'employeeSocial' | 'employeeHealth' | 'employeeUnemployment' | 'employerSocial' | 'employerHealth' | 'employerUnemployment'
const RULE_FIELDS: RuleField[] = [
  'selfDeduct', 'dependentDeduct', 'referenceSalary',
  'minWage1', 'minWage2', 'minWage3', 'minWage4',
  'employeeSocial', 'employeeHealth', 'employeeUnemployment',
  'employerSocial', 'employerHealth', 'employerUnemployment',
]
const EMPTY_FIELDS = Object.fromEntries(RULE_FIELDS.map((key) => [key, ''])) as Record<RuleField, string>
const MONEY: NumberRule = { kind: 'money', min: 0, max: 1e10 }
const RATE: NumberRule = { kind: 'decimal', min: 0, max: 100 }
const FIELD_RULES: Record<RuleField, NumberRule> = {
  selfDeduct: MONEY, dependentDeduct: MONEY, referenceSalary: { ...MONEY, min: 1 }, minWage1: MONEY, minWage2: MONEY, minWage3: MONEY, minWage4: MONEY,
  employeeSocial: RATE, employeeHealth: RATE, employeeUnemployment: RATE, employerSocial: RATE, employerHealth: RATE, employerUnemployment: RATE,
}
const SALARY: NumberRule = { kind: 'money', min: 0, max: 1e12 }
const DEPENDENTS: NumberRule = { kind: 'integer', min: 0, max: 100 }

type ParsedRules = { ok: true; rules: PayrollRules } | { ok: false; reason: 'missing' | 'invalid' | 'order' } | { ok: false; reason: 'line'; line: number }

// Tách lý do để màn hình nói đúng chỗ sai — trước đây mọi trường hợp đều ra "Chưa đủ tham số", kể cả khi đủ mà sai.
function parseRules(fields: Record<RuleField, string>, bracketText: string): ParsedRules {
  if (RULE_FIELDS.some((key) => fields[key].trim() === '') || bracketText.trim() === '') return { ok: false, reason: 'missing' }
  const values = Object.fromEntries(RULE_FIELDS.map((key) => [key, readNumber(fields[key], FIELD_RULES[key])])) as Record<RuleField, number | null>
  if (RULE_FIELDS.some((key) => values[key] === null)) return { ok: false, reason: 'invalid' }
  const parsed = parseRuleLines(bracketText, 'decimal')
  if (!parsed.ok) return { ok: false, reason: 'line', line: parsed.line }
  const value = (key: RuleField) => values[key] as number
  const percent = (key: RuleField) => value(key) / 100
  const rules = validatePayrollRules({
    selfDeduct: value('selfDeduct'), dependentDeduct: value('dependentDeduct'), referenceSalary: value('referenceSalary'),
    minWages: [value('minWage1'), value('minWage2'), value('minWage3'), value('minWage4')],
    employee: { social: percent('employeeSocial'), health: percent('employeeHealth'), unemployment: percent('employeeUnemployment') },
    employer: { social: percent('employerSocial'), health: percent('employerHealth'), unemployment: percent('employerUnemployment') },
    brackets: parsed.lines.map((line) => ({ upTo: line.upTo, rate: line.value / 100 })),
  })
  return rules ? { ok: true, rules } : { ok: false, reason: 'order' }
}

const PAYROLL_KINDS = ['payroll']

export default function PayrollPage() {
  const { t } = useTranslation('finance')
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
  const [mode, setMode] = useState<'gross' | 'net'>('gross')
  const [salary, setSalary] = useState('')
  const [dependents, setDependents] = useState('0')
  const [region, setRegion] = useState<1 | 2 | 3 | 4>(1)
  const [insuranceBase, setInsuranceBase] = useState('')
  const [exempt, setExempt] = useState('0')
  const [fields, setFields] = useState<Record<RuleField, string>>(EMPTY_FIELDS)
  const [bracketText, setBracketText] = useState('')
  const [usingVerified, setUsingVerified] = useState(false)
  const payrollRules = useSignedRules('payroll', validatePayrollRules)
  const verified = payrollRules.state === 'ready' ? payrollRules.current : null
  const parsed = parseRules(fields, bracketText)
  const salaryValue = readNumber(salary, SALARY)
  const dependentsValue = readNumber(dependents, DEPENDENTS)
  const baseValue = insuranceBase.trim() === '' ? undefined : readNumber(insuranceBase, SALARY)
  const exemptValue = exempt.trim() === '' ? 0 : readNumber(exempt, SALARY)
  const inputsOk = salaryValue !== null && dependentsValue !== null && baseValue !== null && exemptValue !== null
  const options = { dependents: dependentsValue ?? 0, region, insuranceBase: baseValue ?? undefined, exempt: exemptValue ?? 0 }
  const result = parsed.ok && inputsOk ? mode === 'gross' ? grossToNet(salaryValue, options, parsed.rules) : netToGross(salaryValue, options, parsed.rules) : null
  const problem = !parsed.ok ? parsed.reason === 'line' ? t('payroll.errors.bracketLine', { line: parsed.line })
    : parsed.reason === 'order' ? t('payroll.errors.bracketOrder') : parsed.reason === 'invalid' ? t('payroll.errors.params') : t('payroll.missingParams')
    : salary.trim() === '' ? t('payroll.errors.salary')
      : !inputsOk ? t('payroll.errors.inputs')
        : mode === 'gross' && salaryValue !== null && (exemptValue ?? 0) > salaryValue ? t('payroll.errors.exempt')
          : t('payroll.errors.noGross')
  const updateField = (key: RuleField, value: string) => { setFields((current) => ({ ...current, [key]: value })); setUsingVerified(false) }
  const applyVerified = () => {
    if (!verified) return
    const { data } = verified
    setFields({
      selfDeduct: String(data.selfDeduct), dependentDeduct: String(data.dependentDeduct), referenceSalary: String(data.referenceSalary),
      minWage1: String(data.minWages[0]), minWage2: String(data.minWages[1]), minWage3: String(data.minWages[2]), minWage4: String(data.minWages[3]),
      employeeSocial: String(data.employee.social * 100), employeeHealth: String(data.employee.health * 100), employeeUnemployment: String(data.employee.unemployment * 100),
      employerSocial: String(data.employer.social * 100), employerHealth: String(data.employer.health * 100), employerUnemployment: String(data.employer.unemployment * 100),
    })
    setBracketText(formatRuleLines(data.brackets.map((bracket) => ({ upTo: bracket.upTo, value: bracket.rate * 100 }))))
    setUsingVerified(true)
  }
  const saveAdapter: SaveAdapter = {
    snapshot: () => payrollSnapshot({ mode, salary, dependents, region, insuranceBase, exempt, fields, bracketText }),
    restore: (payload) => {
      const saved = parsePayrollSaved(payload, RULE_FIELDS)
      if (!saved) return false
      setMode(saved.mode); setSalary(saved.salary); setDependents(saved.dependents); setRegion(saved.region)
      setInsuranceBase(saved.insuranceBase); setExempt(saved.exempt); setFields(saved.fields); setBracketText(saved.bracketText)
      setUsingVerified(false)
      return true
    },
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('payroll.resultLabel')}</p>
    <p className="erp-tool-result__value">{result ? t('payroll.net', { amount: formatNumber(result.net) }) : '—'}</p>
    {result ? <div className="table-responsive"><table className="table table-sm"><tbody>
      <tr><th>{t('payroll.rows.gross')}</th><td>{t('shared.amount', { amount: formatNumber(result.gross) })}</td></tr><tr><th>{t('payroll.rows.employeeSocial')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.social) })}</td></tr><tr><th>{t('payroll.rows.employeeHealth')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.health) })}</td></tr><tr><th>{t('payroll.rows.employeeUnemployment')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.unemployment) })}</td></tr>
      <tr><th>{t('payroll.rows.deduction')}</th><td>{t('shared.amount', { amount: formatNumber(result.deduction) })}</td></tr><tr><th>{t('payroll.rows.taxable')}</th><td>{t('shared.amount', { amount: formatNumber(result.taxable) })}</td></tr>
      {result.taxRows.map((row) => <tr key={row.level}><th>{t('payroll.rows.bracket', { level: row.level, rate: formatNumber(row.rate * 100) })}</th><td>{t('shared.amount', { amount: formatNumber(row.amount) })}</td></tr>)}
      <tr><th>{t('payroll.rows.tax')}</th><td>{t('shared.amount', { amount: formatNumber(result.tax) })}</td></tr><tr><th>{t('payroll.rows.employerTotal')}</th><td>{t('shared.amount', { amount: formatNumber(result.employerTotal) })}</td></tr><tr><th>{t('payroll.rows.employerCost')}</th><td>{t('shared.amount', { amount: formatNumber(result.employerCost) })}</td></tr>
    </tbody></table></div> : <><p className="erp-tool-result__note" role="status">{problem}</p><p className="erp-tool-result__note">{t('payroll.hint')}</p></>}
    <p className="erp-tool-result__note">{usingVerified && verified ? t('payroll.paramsVerified', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('payroll.paramsManual')} {t('payroll.notSettlement')}</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('shared.viewSource')}</a> : null}
  </div>}>
    <ToolPanel title={t('payroll.panelTitle')}>
      <label className="erp-flow-field__label">{t('payroll.direction')}<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="gross">{t('payroll.directions.gross')}</option><option value="net">{t('payroll.directions.net')}</option></Form.Select></label>
      <NumberField className="mt-3" label={mode === 'gross' ? t('payroll.grossSalary') : t('payroll.netSalary')} rule={SALARY} unit="đ" value={salary} onChange={setSalary} />
      <div className="erp-tool-form__grid mt-3">
        <NumberField label={t('payroll.dependents')} rule={DEPENDENTS} value={dependents} onChange={setDependents} />
        <label className="erp-flow-field__label">{t('payroll.region')}<Form.Select value={region} onChange={(event) => setRegion(Number(event.target.value) as typeof region)}>{[1, 2, 3, 4].map((value) => <option value={value} key={value}>{t('payroll.regionOption', { region: value })}</option>)}</Form.Select></label>
        <NumberField label={t('payroll.insuranceBase')} rule={SALARY} unit="đ" value={insuranceBase} onChange={setInsuranceBase} />
        <NumberField label={t('payroll.exempt')} rule={SALARY} unit="đ" value={exempt} onChange={setExempt} />
      </div>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>{t('payroll.applyParams')}</Button> : null}
      <RuleStatus rules={payrollRules} label={t('payroll.ruleLabel')} noneText={t('payroll.ruleNone')} />
      <details className="mt-3"><summary>{t('payroll.enterParams')}</summary><div className="erp-tool-form__grid mt-3">{RULE_FIELDS.map((key) => <NumberField key={key} label={t(`payroll.fields.${key}`)} rule={FIELD_RULES[key]} unit={FIELD_RULES[key] === RATE ? '%' : 'đ'} value={fields[key]} onChange={(value) => updateField(key, value)} />)}</div>
        <label className="erp-flow-field__label mt-3">{t('payroll.brackets')}<Form.Control as="textarea" rows={6} placeholder={'10.000.000; 5\n30.000.000; 10\n*; 20'} value={bracketText} onChange={(event) => { setBracketText(event.target.value); setUsingVerified(false) }} /></label>
      </details>
    </ToolPanel>
    <SaveResultBar member={member} toolId="luong" adapter={saveAdapter} />
    <AiSourceCheckPanel member={member} loginTo={loginPath('/luong')} toolId="luong" domain="payroll" kinds={PAYROLL_KINDS} snapshot={ruleSnapshot(verified)} currentResult={result ? t('payroll.aiResult', { gross: result.gross, net: result.net }) : ''} />
  </ToolBoard>
}
