import { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { fetchVerifiedRules, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { ByoAiPanel } from '@/features/tools/byoai/components/ByoAiPanel'
import { grossToNet, netToGross, validatePayrollRules, type PayrollRules } from '../utils/payroll'

type RuleField = 'selfDeduct' | 'dependentDeduct' | 'referenceSalary' | 'minWage1' | 'minWage2' | 'minWage3' | 'minWage4' | 'employeeSocial' | 'employeeHealth' | 'employeeUnemployment' | 'employerSocial' | 'employerHealth' | 'employerUnemployment'
const RULE_FIELDS: { key: RuleField; label: string }[] = [
  { key: 'selfDeduct', label: 'Giảm trừ bản thân (đ)' }, { key: 'dependentDeduct', label: 'Giảm trừ mỗi người phụ thuộc (đ)' }, { key: 'referenceSalary', label: 'Lương tham chiếu để tính trần bảo hiểm (đ)' },
  { key: 'minWage1', label: 'Lương tối thiểu vùng I (đ)' }, { key: 'minWage2', label: 'Lương tối thiểu vùng II (đ)' }, { key: 'minWage3', label: 'Lương tối thiểu vùng III (đ)' }, { key: 'minWage4', label: 'Lương tối thiểu vùng IV (đ)' },
  { key: 'employeeSocial', label: 'Người lao động: BHXH (%)' }, { key: 'employeeHealth', label: 'Người lao động: BHYT (%)' }, { key: 'employeeUnemployment', label: 'Người lao động: BHTN (%)' },
  { key: 'employerSocial', label: 'Doanh nghiệp: BHXH (%)' }, { key: 'employerHealth', label: 'Doanh nghiệp: BHYT (%)' }, { key: 'employerUnemployment', label: 'Doanh nghiệp: BHTN (%)' },
]
const EMPTY_FIELDS = Object.fromEntries(RULE_FIELDS.map(({ key }) => [key, ''])) as Record<RuleField, string>
const percent = (value: string) => Number(value) / 100

function parseRules(fields: Record<RuleField, string>, bracketText: string): PayrollRules | null {
  if (RULE_FIELDS.some(({ key }) => fields[key].trim() === '')) return null
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

export default function PayrollPage() {
  const [mode, setMode] = useState<'gross' | 'net'>('gross')
  const [salary, setSalary] = useState('')
  const [dependents, setDependents] = useState('0')
  const [region, setRegion] = useState<1 | 2 | 3 | 4>(1)
  const [insuranceBase, setInsuranceBase] = useState('')
  const [exempt, setExempt] = useState('0')
  const [fields, setFields] = useState<Record<RuleField, string>>(EMPTY_FIELDS)
  const [bracketText, setBracketText] = useState('')
  const [verified, setVerified] = useState<VerifiedRulePackage<PayrollRules> | null>(null)
  const [usingVerified, setUsingVerified] = useState(false)
  useEffect(() => { void fetchVerifiedRules<PayrollRules>('payroll').then((item) => { if (item && validatePayrollRules(item.data)) setVerified(item) }).catch(() => undefined) }, [])
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
    <p className="erp-tool-result__label">Kết quả tham khảo</p>
    <p className="erp-tool-result__value">{result ? `Thực nhận ${formatNumber(result.net)} đ` : 'Chưa đủ tham số'}</p>
    {result ? <div className="table-responsive"><table className="table table-sm"><tbody>
      <tr><th>Gross</th><td>{formatNumber(result.gross)} đ</td></tr><tr><th>BHXH người lao động</th><td>{formatNumber(result.employee.social)} đ</td></tr><tr><th>BHYT người lao động</th><td>{formatNumber(result.employee.health)} đ</td></tr><tr><th>BHTN người lao động</th><td>{formatNumber(result.employee.unemployment)} đ</td></tr>
      <tr><th>Giảm trừ</th><td>{formatNumber(result.deduction)} đ</td></tr><tr><th>Thu nhập tính thuế</th><td>{formatNumber(result.taxable)} đ</td></tr>
      {result.taxRows.map((row) => <tr key={row.level}><th>Bậc {row.level} · {formatNumber(row.rate * 100)}%</th><td>{formatNumber(row.amount)} đ</td></tr>)}
      <tr><th>Thuế TNCN</th><td>{formatNumber(result.tax)} đ</td></tr><tr><th>Doanh nghiệp đóng thêm</th><td>{formatNumber(result.employerTotal)} đ</td></tr><tr><th>Tổng chi phí doanh nghiệp</th><td>{formatNumber(result.employerCost)} đ</td></tr>
    </tbody></table></div> : <p className="erp-tool-result__note">Điền đầy đủ tham số từ bộ quy tắc đã ký hoặc bảng lương, hợp đồng và hướng dẫn của kế toán.</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? `Gói tham số có chữ ký, hiệu lực từ ${verified.effectiveFrom}. Nguồn: ${verified.source.title}.` : 'Thông số do bạn nhập; công cụ không xác nhận đây là quy định hiện hành.'} Kết quả chưa thay thế quyết toán thuế thực tế.</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">Xem nguồn dữ liệu</a> : null}
  </div>}>
    <ToolPanel title="Tính lương Gross – Net">
      <label className="erp-flow-field__label">Chiều tính<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="gross">Gross → Net</option><option value="net">Net → Gross</option></Form.Select></label>
      <label className="erp-flow-field__label mt-3">{mode === 'gross' ? 'Lương Gross (đ/tháng)' : 'Lương Net mong muốn (đ/tháng)'}<Form.Control type="number" min="0" step="1" value={salary} onChange={(event) => setSalary(event.target.value)} /></label>
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">Người phụ thuộc<Form.Control type="number" min="0" step="1" value={dependents} onChange={(event) => setDependents(event.target.value)} /></label>
        <label className="erp-flow-field__label">Vùng<Form.Select value={region} onChange={(event) => setRegion(Number(event.target.value) as typeof region)}>{[1, 2, 3, 4].map((value) => <option value={value} key={value}>Vùng {value}</option>)}</Form.Select></label>
        <label className="erp-flow-field__label">Lương đóng bảo hiểm (đ, để trống = Gross)<Form.Control type="number" min="0" step="1" value={insuranceBase} onChange={(event) => setInsuranceBase(event.target.value)} /></label>
        <label className="erp-flow-field__label">Phụ cấp miễn thuế trong Gross (đ)<Form.Control type="number" min="0" step="1" value={exempt} onChange={(event) => setExempt(event.target.value)} /></label>
      </div>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>Áp dụng tham số đã ký</Button> : <p className="mt-3">Chưa có gói quy tắc lương đã ký, còn hiệu lực trên hệ thống.</p>}
      <details className="mt-3"><summary>Nhập tham số tính lương</summary><div className="erp-tool-form__grid mt-3">{RULE_FIELDS.map(({ key, label }) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min="0" step="any" value={fields[key]} onChange={(event) => updateField(key, event.target.value)} /></label>)}</div>
        <label className="erp-flow-field__label mt-3">Biểu thuế: “ngưỡng thu nhập tính thuế (đ), thuế suất (%)”; dòng cuối dùng *<Form.Control as="textarea" rows={6} placeholder={'10000000,5\n30000000,10\n*,20'} value={bracketText} onChange={(event) => { setBracketText(event.target.value); setUsingVerified(false) }} /></label>
      </details>
    </ToolPanel>
    <ByoAiPanel toolId="luong" domain="payroll" snapshot={usingVerified && verified ? verified.digest : null} checkedAt={usingVerified && verified ? verified.source.retrievedAt : null} sources={usingVerified && verified ? [verified.source.url] : []} currentResult={result ? `Gross ${result.gross} đ; Net ${result.net} đ` : ''} />
  </ToolBoard>
}
