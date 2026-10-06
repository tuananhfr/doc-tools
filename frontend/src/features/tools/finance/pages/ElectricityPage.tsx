import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { formatRuleDate, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { ByoAiPanel } from '@/features/tools/byoai/components/ByoAiPanel'
import { electricityBill, parseElectricityRules, validateElectricityTiers, waterBill } from '../utils/electricity'
import { parseVatRule } from '../utils/vat-rule'

export default function ElectricityPage() {
  const [mode, setMode] = useState<'electricity' | 'water'>('electricity')
  const [kwh, setKwh] = useState('')
  const [households, setHouseholds] = useState('1')
  const [vat, setVat] = useState('0')
  const [lines, setLines] = useState('')
  const [water, setWater] = useState({ cubicMeters: '', price: '', fee: '0', vat: '0' })
  const [usingVerified, setUsingVerified] = useState(false)
  const [appliedVat, setAppliedVat] = useState<{ percent: number; from: VerifiedRulePackage<unknown> } | null>(null)
  const electricityRules = useSignedRules('electricity', parseElectricityRules)
  const vatRules = useSignedRules('vat', parseVatRule)
  const verified = electricityRules.state === 'ready' ? electricityRules.current : null
  // Gói `vat` riêng thắng `vatPercent` trong bảng giá: thuế đổi theo luật thuế, không theo kỳ điều chỉnh giá điện.
  const signedVat = vatRules.state === 'ready' ? { percent: vatRules.current.data.percent, from: vatRules.current as VerifiedRulePackage<unknown> }
    : verified?.data.vatPercent !== undefined ? { percent: verified.data.vatPercent, from: verified as VerifiedRulePackage<unknown> } : null
  const parsed = lines.trim().split('\n').filter(Boolean).map((line) => {
    const [threshold, rate] = line.split(',').map((part) => part.trim())
    return { upTo: threshold === '*' ? null : /^\d+$/.test(threshold) ? Number(threshold) : Number.NaN, price: rate ? Number(rate) : Number.NaN }
  })
  const tiers = validateElectricityTiers(parsed)
  const result = tiers && kwh !== '' ? electricityBill(Number(kwh), tiers, Number(vat), Number(households)) : null
  const waterResult = water.cubicMeters !== '' && water.price !== '' ? waterBill(Number(water.cubicMeters), Number(water.price), Number(water.fee), Number(water.vat)) : null
  const updateLines = (value: string) => { setLines(value); setUsingVerified(false) }
  const applyVat = () => {
    if (!signedVat) return
    setVat(String(signedVat.percent))
    setAppliedVat(signedVat)
  }
  const applyVerified = () => {
    if (!verified) return
    setLines(verified.data.tiers.map((tier) => `${tier.upTo ?? '*'},${tier.price}`).join('\n'))
    setUsingVerified(true)
    applyVat()
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Ước tính hóa đơn</p>
    <p className="erp-tool-result__value">{mode === 'water' ? waterResult ? `${formatNumber(Math.round(waterResult.total))} đ` : '—' : result ? `${formatNumber(Math.round(result.total))} đ` : '—'}</p>
    {mode === 'water' ? waterResult ? <p className="erp-tool-result__note">Tiền nước: {formatNumber(waterResult.subtotal)} đ · Phí: {formatNumber(waterResult.fee)} đ · Thuế: {formatNumber(waterResult.vat)} đ. Các khoản tính riêng trên tiền nước gốc.</p> : <p className="erp-tool-result__note">Nhập lượng nước và đơn giá trên hóa đơn gần nhất.</p> : <>
    {result ? <><p className="erp-tool-result__note">Tiền điện trước thuế: {formatNumber(result.subtotal)} đ · Thuế {formatNumber(Number(vat))}%: {formatNumber(result.vat)} đ</p>
      <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Bậc đến kWh</th><th>Số kWh</th><th>Giá/kWh</th><th>Thành tiền</th></tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}><td>{row.upTo ?? 'Còn lại'}</td><td>{formatNumber(row.units)}</td><td>{formatNumber(row.price)}</td><td>{formatNumber(row.amount)}</td></tr>)}</tbody></table></div></> : <p className="erp-tool-result__note">Nhập số điện và bảng giá theo hóa đơn hoặc hợp đồng. Dòng cuối dùng dấu * cho phần còn lại.</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? `Bảng giá có chữ ký, hiệu lực từ ${formatRuleDate(verified.effectiveFrom)}. Nguồn: ${verified.source.title}.` : 'Bảng giá do bạn nhập; công cụ không xác nhận đây là giá bán điện hiện hành.'} {appliedVat ? `Thuế suất ${formatNumber(appliedVat.percent)}% có chữ ký, hiệu lực từ ${formatRuleDate(appliedVat.from.effectiveFrom)}. Nguồn: ${appliedVat.from.source.title}.` : 'Thuế suất do bạn nhập.'} Chưa tính phí khác hoặc cách làm tròn của nhà cung cấp.</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">Xem nguồn dữ liệu</a> : null}</>}
  </div>}>
    <ToolPanel title="Tiền điện, nước">
      <label className="erp-flow-field__label">Loại hóa đơn<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="electricity">Tiền điện</option><option value="water">Tiền nước</option></Form.Select></label>
      {mode === 'water' ? <div className="erp-tool-form__grid mt-3">{([
        ['cubicMeters', 'Số m³ nước'], ['price', 'Đơn giá (đ/m³)'], ['fee', 'Phí thoát nước / môi trường (%)'], ['vat', 'Thuế (%)'],
      ] as [keyof typeof water, string][]).map(([key, label]) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min="0" step="any" value={water[key]} onChange={(event) => setWater((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div> : <>
      <label className="erp-flow-field__label">Điện tiêu thụ (kWh)<Form.Control type="number" min="0" step="any" inputMode="decimal" value={kwh} onChange={(event) => setKwh(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">Số định mức hộ dùng chung công tơ<Form.Control type="number" min="1" step="1" value={households} onChange={(event) => setHouseholds(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">Bảng giá: mỗi dòng là “ngưỡng kWh, đơn giá đ/kWh”<Form.Control as="textarea" rows={7} placeholder={'50,1800\n100,2200\n*,3000'} value={lines} onChange={(event) => updateLines(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">Thuế (%)<Form.Control type="number" min="0" max="100" step="any" value={vat} onChange={(event) => { setVat(event.target.value); setAppliedVat(null) }} /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>Áp dụng bảng giá đã ký</Button>
        : signedVat ? <Button className="mt-3" variant="outline-secondary" onClick={applyVat}>Áp dụng thuế suất đã ký</Button> : null}
      <RuleStatus rules={electricityRules} label="bảng giá điện" noneText="Hiện chưa có bảng giá điện đã ký, còn hiệu lực trên hệ thống." />
      {vatRules.state === 'ready' || vatRules.state === 'none' || vatRules.state === 'invalid' ? <RuleStatus rules={vatRules} label="thuế suất GTGT" /> : null}
      </>}
    </ToolPanel>
    <ByoAiPanel toolId="tien-dien" domain="electricity" snapshot={usingVerified && verified ? verified.digest : null} checkedAt={usingVerified && verified ? verified.source.retrievedAt : null} sources={usingVerified && verified ? [verified.source.url] : []} currentResult={mode === 'water' ? waterResult ? `Nước ${water.cubicMeters} m³; tổng ${waterResult.total} đ` : '' : result ? `Điện ${kwh} kWh; tổng ${result.total} đ` : ''} />
  </ToolBoard>
}
