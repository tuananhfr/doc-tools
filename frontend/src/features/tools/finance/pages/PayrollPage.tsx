import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { formatRuleDate, ruleSnapshot } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { grossToNet, netToGross, validatePayrollRules, type PayrollRules } from '../utils/payroll'

type RuleField = 'selfDeduct' | 'dependentDeduct' | 'referenceSalary' | 'minWage1' | 'minWage2' | 'minWage3' | 'minWage4' | 'employeeSocial' | 'employeeHealth' | 'employeeUnemployment' | 'employerSocial' | 'employerHealth' | 'employerUnemployment'
const RULE_FIELDS: RuleField[] = [
  'selfDeduct', 'dependentDeduct', 'referenceSalary',
  'minWage1', 'minWage2', 'minWage3', 'minWage4',
  'employeeSocial', 'employeeHealth', 'employeeUnemployment',
  'employerSocial', 'employerHealth', 'employerUnemployment',
]
const EMPTY_FIELDS = Object.fromEntries(RULE_FIELDS.map((key) => [key, ''])) as Record<RuleField, string>
const percent = (value: string) => Number(value) / 100

function parseRules(fields: Record<RuleField, string>, bracketText: string): PayrollRules | null {
  if (RULE_FIELDS.some((key) => fields[key].trim() === '')) return null
  const brackets = bracketText.trim().split('\n').filter(Boolean).map((line) => {
    const [cap, rate] = line.split(',').map((part) => part.trim())
    return { upTo: cap === '*' ? null : /^\d+$/.test(cap) ? Number(cap) : Number.NaN, rate: rate ? percent(rate) : Number.NaN }
  })
  return validatePayrollRules({
    selfDeduct: Number(fields.selfDeduct), dependentDeduct: Number(fields.dependentDeduct), referenceSalary: Number(fields.referenceSalary),
    minWages: [Number(fields.minWage1), Number(fields.minWage2), Number(fields.minWage3), Number(fields.minWage4)],
    employee: { social: percent(fields.employeeSocial), health: percent(fields.employeeHealth), unemployment: percent(fields.employeeUnemployment) },
    employer: { social: percent(fields.employerSocial), health: percent(fields.employerHealth), unemployment: percent(fields.employerUnemployment) }, brackets,
  })
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
  const rules = parseRules(fields, bracketText)
  const options = { dependents: Number(dependents), region, insuranceBase: insuranceBase === '' ? undefined : Number(insuranceBase), exempt: Number(exempt) }
  const result = rules && salary !== '' ? mode === 'gross' ? grossToNet(Number(salary), options, rules) : netToGross(Number(salary), options, rules) : null
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
    setBracketText(data.brackets.map((bracket) => `${bracket.upTo ?? '*'},${bracket.rate * 100}`).join('\n'))
    setUsingVerified(true)
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('payroll.resultLabel')}</p>
    <p className="erp-tool-result__value">{result ? t('payroll.net', { amount: formatNumber(result.net) }) : t('payroll.missingParams')}</p>
    {result ? <div className="table-responsive"><table className="table table-sm"><tbody>
      <tr><th>{t('payroll.rows.gross')}</th><td>{t('shared.amount', { amount: formatNumber(result.gross) })}</td></tr><tr><th>{t('payroll.rows.employeeSocial')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.social) })}</td></tr><tr><th>{t('payroll.rows.employeeHealth')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.health) })}</td></tr><tr><th>{t('payroll.rows.employeeUnemployment')}</th><td>{t('shared.amount', { amount: formatNumber(result.employee.unemployment) })}</td></tr>
      <tr><th>{t('payroll.rows.deduction')}</th><td>{t('shared.amount', { amount: formatNumber(result.deduction) })}</td></tr><tr><th>{t('payroll.rows.taxable')}</th><td>{t('shared.amount', { amount: formatNumber(result.taxable) })}</td></tr>
      {result.taxRows.map((row) => <tr key={row.level}><th>{t('payroll.rows.bracket', { level: row.level, rate: formatNumber(row.rate * 100) })}</th><td>{t('shared.amount', { amount: formatNumber(row.amount) })}</td></tr>)}
      <tr><th>{t('payroll.rows.tax')}</th><td>{t('shared.amount', { amount: formatNumber(result.tax) })}</td></tr><tr><th>{t('payroll.rows.employerTotal')}</th><td>{t('shared.amount', { amount: formatNumber(result.employerTotal) })}</td></tr><tr><th>{t('payroll.rows.employerCost')}</th><td>{t('shared.amount', { amount: formatNumber(result.employerCost) })}</td></tr>
    </tbody></table></div> : <p className="erp-tool-result__note">{t('payroll.hint')}</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? t('payroll.paramsVerified', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('payroll.paramsManual')} {t('payroll.notSettlement')}</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('shared.viewSource')}</a> : null}
  </div>}>
    <ToolPanel title={t('payroll.panelTitle')}>
      <label className="erp-flow-field__label">{t('payroll.direction')}<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="gross">{t('payroll.directions.gross')}</option><option value="net">{t('payroll.directions.net')}</option></Form.Select></label>
      <label className="erp-flow-field__label mt-3">{mode === 'gross' ? t('payroll.grossSalary') : t('payroll.netSalary')}<Form.Control type="number" min="0" step="1" value={salary} onChange={(event) => setSalary(event.target.value)} /></label>
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">{t('payroll.dependents')}<Form.Control type="number" min="0" step="1" value={dependents} onChange={(event) => setDependents(event.target.value)} /></label>
        <label className="erp-flow-field__label">{t('payroll.region')}<Form.Select value={region} onChange={(event) => setRegion(Number(event.target.value) as typeof region)}>{[1, 2, 3, 4].map((value) => <option value={value} key={value}>{t('payroll.regionOption', { region: value })}</option>)}</Form.Select></label>
        <label className="erp-flow-field__label">{t('payroll.insuranceBase')}<Form.Control type="number" min="0" step="1" value={insuranceBase} onChange={(event) => setInsuranceBase(event.target.value)} /></label>
        <label className="erp-flow-field__label">{t('payroll.exempt')}<Form.Control type="number" min="0" step="1" value={exempt} onChange={(event) => setExempt(event.target.value)} /></label>
      </div>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>{t('payroll.applyParams')}</Button> : null}
      <RuleStatus rules={payrollRules} label={t('payroll.ruleLabel')} noneText={t('payroll.ruleNone')} />
      <details className="mt-3"><summary>{t('payroll.enterParams')}</summary><div className="erp-tool-form__grid mt-3">{RULE_FIELDS.map((key) => <label className="erp-flow-field__label" key={key}>{t(`payroll.fields.${key}`)}<Form.Control type="number" min="0" step="any" value={fields[key]} onChange={(event) => updateField(key, event.target.value)} /></label>)}</div>
        <label className="erp-flow-field__label mt-3">{t('payroll.brackets')}<Form.Control as="textarea" rows={6} placeholder={'10000000,5\n30000000,10\n*,20'} value={bracketText} onChange={(event) => { setBracketText(event.target.value); setUsingVerified(false) }} /></label>
      </details>
    </ToolPanel>
    <AiSourceCheckPanel member={member} loginTo={loginPath('/luong')} toolId="luong" domain="payroll" kinds={PAYROLL_KINDS} snapshot={ruleSnapshot(verified)} currentResult={result ? t('payroll.aiResult', { gross: result.gross, net: result.net }) : ''} />
  </ToolBoard>
}
