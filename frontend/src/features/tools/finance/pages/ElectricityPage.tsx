import { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { fetchVerifiedRules, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { ByoAiPanel } from '@/features/tools/byoai/components/ByoAiPanel'
import { electricityBill, validateElectricityTiers, waterBill, type ElectricityTier } from '../utils/electricity'

interface ElectricityRules { tiers: ElectricityTier[]; vatPercent: number }

export default function ElectricityPage() {
  const [mode, setMode] = useState<'electricity' | 'water'>('electricity')
  const [kwh, setKwh] = useState('')
  const [households, setHouseholds] = useState('1')
  const [vat, setVat] = useState('0')
  const [lines, setLines] = useState('')
  const [water, setWater] = useState({ cubicMeters: '', price: '', fee: '0', vat: '0' })
  const [verified, setVerified] = useState<VerifiedRulePackage<ElectricityRules> | null>(null)
  const [usingVerified, setUsingVerified] = useState(false)
  useEffect(() => { void fetchVerifiedRules<ElectricityRules>('electricity').then((item) => {
    if (item && validateElectricityTiers(item.data?.tiers) && Number.isFinite(item.data.vatPercent) && item.data.vatPercent >= 0 && item.data.vatPercent <= 100) setVerified(item)
  }).catch(() => undefined) }, [])
  const parsed = lines.trim().split('\n').filter(Boolean).map((line) => {
    const [threshold, rate] = line.split(',').map((part) => part.trim())
    return { upTo: threshold === '*' ? null : /^\d+$/.test(threshold) ? Number(threshold) : Number.NaN, price: rate ? Number(rate) : Number.NaN }
  })
  const tiers = validateElectricityTiers(parsed)
  const result = tiers && kwh !== '' ? electricityBill(Number(kwh), tiers, Number(vat), Number(households)) : null
  const waterResult = water.cubicMeters !== '' && water.price !== '' ? waterBill(Number(water.cubicMeters), Number(water.price), Number(water.fee), Number(water.vat)) : null
  const updateLines = (value: string) => { setLines(value); setUsingVerified(false) }
  const applyVerified = () => {
    if (!verified) return
    setLines(verified.data.tiers.map((tier) => `${tier.upTo ?? '*'},${tier.price}`).join('\n'))
    setVat(String(verified.data.vatPercent))
    setUsingVerified(true)
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Ước tính hóa đơn</p>
    <p className="erp-tool-result__value">{mode === 'water' ? waterResult ? `${formatNumber(Math.round(waterResult.total))} đ` : '—' : result ? `${formatNumber(Math.round(result.total))} đ` : '—'}</p>
    {mode === 'water' ? waterResult ? <p className="erp-tool-result__note">Tiền nước: {formatNumber(waterResult.subtotal)} đ · Phí: {formatNumber(waterResult.fee)} đ · Thuế: {formatNumber(waterResult.vat)} đ. Các khoản tính riêng trên tiền nước gốc.</p> : <p className="erp-tool-result__note">Nhập lượng nước và đơn giá trên hóa đơn gần nhất.</p> : <>
    {result ? <><p className="erp-tool-result__note">Tiền điện trước thuế: {formatNumber(result.subtotal)} đ · Thuế theo tỷ lệ đã nhập: {formatNumber(result.vat)} đ</p>
      <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Bậc đến kWh</th><th>Số kWh</th><th>Giá/kWh</th><th>Thành tiền</th></tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}><td>{row.upTo ?? 'Còn lại'}</td><td>{formatNumber(row.units)}</td><td>{formatNumber(row.price)}</td><td>{formatNumber(row.amount)}</td></tr>)}</tbody></table></div></> : <p className="erp-tool-result__note">Nhập số điện và bảng giá theo hóa đơn hoặc hợp đồng. Dòng cuối dùng dấu * cho phần còn lại.</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? `Bảng giá có chữ ký, hiệu lực từ ${verified.effectiveFrom}. Nguồn: ${verified.source.title}.` : 'Bảng giá do bạn nhập; công cụ không xác nhận đây là giá bán điện hiện hành.'} Chưa tính phí khác hoặc cách làm tròn của nhà cung cấp.</p>
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
      <label className="erp-flow-field__label mt-3">Thuế (%)<Form.Control type="number" min="0" max="100" step="any" value={vat} onChange={(event) => { setVat(event.target.value); setUsingVerified(false) }} /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>Áp dụng bảng giá đã ký</Button> : <p className="mt-3">Hiện chưa có bảng giá đã ký, còn hiệu lực trên hệ thống.</p>}
      </>}
    </ToolPanel>
    <ByoAiPanel toolId="tien-dien" domain="electricity" snapshot={usingVerified && verified ? verified.digest : null} checkedAt={usingVerified && verified ? verified.source.retrievedAt : null} sources={usingVerified && verified ? [verified.source.url] : []} currentResult={mode === 'water' ? waterResult ? `Nước ${water.cubicMeters} m³; tổng ${waterResult.total} đ` : '' : result ? `Điện ${kwh} kWh; tổng ${result.total} đ` : ''} />
  </ToolBoard>
}
