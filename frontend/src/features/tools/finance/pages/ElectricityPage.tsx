import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { formatRuleDate, ruleSnapshot, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { electricityBill, parseElectricityRules, validateElectricityTiers, waterBill } from '../utils/electricity'
import { parseVatRule } from '../utils/vat-rule'

// Thuế điện có gói `vat` riêng, nên lượt kiểm nguồn đọc cả hai.
const ELECTRICITY_KINDS = ['electricity', 'vat']

export default function ElectricityPage() {
  const { t } = useTranslation('finance')
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
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
    <p className="erp-tool-result__label">{t('electricity.resultLabel')}</p>
    <p className="erp-tool-result__value">{mode === 'water' ? waterResult ? t('shared.amount', { amount: formatNumber(Math.round(waterResult.total)) }) : '—' : result ? t('shared.amount', { amount: formatNumber(Math.round(result.total)) }) : '—'}</p>
    {mode === 'water' ? waterResult ? <p className="erp-tool-result__note">{t('electricity.waterBreakdown', { subtotal: formatNumber(waterResult.subtotal), fee: formatNumber(waterResult.fee), vat: formatNumber(waterResult.vat) })}</p> : <p className="erp-tool-result__note">{t('electricity.waterHint')}</p> : <>
    {result ? <><p className="erp-tool-result__note">{t('electricity.electricityBreakdown', { subtotal: formatNumber(result.subtotal), percent: formatNumber(Number(vat)), vat: formatNumber(result.vat) })}</p>
      <div className="table-responsive"><table className="table table-sm"><thead><tr><th>{t('electricity.table.upTo')}</th><th>{t('electricity.table.units')}</th><th>{t('electricity.table.price')}</th><th>{t('electricity.table.amount')}</th></tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}><td>{row.upTo ?? t('electricity.table.rest')}</td><td>{formatNumber(row.units)}</td><td>{formatNumber(row.price)}</td><td>{formatNumber(row.amount)}</td></tr>)}</tbody></table></div></> : <p className="erp-tool-result__note">{t('electricity.electricityHint')}</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? t('electricity.tariffVerified', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('electricity.tariffManual')} {appliedVat ? t('electricity.vatVerified', { percent: formatNumber(appliedVat.percent), date: formatRuleDate(appliedVat.from.effectiveFrom), source: appliedVat.from.source.title }) : t('electricity.vatManual')} {t('electricity.notIncluded')}</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('shared.viewSource')}</a> : null}</>}
  </div>}>
    <ToolPanel title={t('electricity.panelTitle')}>
      <label className="erp-flow-field__label">{t('electricity.billType')}<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="electricity">{t('electricity.modes.electricity')}</option><option value="water">{t('electricity.modes.water')}</option></Form.Select></label>
      {mode === 'water' ? <div className="erp-tool-form__grid mt-3">{([
        ['cubicMeters', t('electricity.water.cubicMeters')], ['price', t('electricity.water.price')], ['fee', t('electricity.water.fee')], ['vat', t('shared.vatPercent')],
      ] as [keyof typeof water, string][]).map(([key, label]) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min="0" step="any" value={water[key]} onChange={(event) => setWater((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div> : <>
      <label className="erp-flow-field__label">{t('electricity.kwh')}<Form.Control type="number" min="0" step="any" inputMode="decimal" value={kwh} onChange={(event) => setKwh(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">{t('electricity.households')}<Form.Control type="number" min="1" step="1" value={households} onChange={(event) => setHouseholds(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">{t('electricity.tiers')}<Form.Control as="textarea" rows={7} placeholder={'50,1800\n100,2200\n*,3000'} value={lines} onChange={(event) => updateLines(event.target.value)} /></label>
      <label className="erp-flow-field__label mt-3">{t('shared.vatPercent')}<Form.Control type="number" min="0" max="100" step="any" value={vat} onChange={(event) => { setVat(event.target.value); setAppliedVat(null) }} /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>{t('electricity.applyTariff')}</Button>
        : signedVat ? <Button className="mt-3" variant="outline-secondary" onClick={applyVat}>{t('electricity.applyVat')}</Button> : null}
      <RuleStatus rules={electricityRules} label={t('electricity.ruleLabel')} noneText={t('electricity.ruleNone')} />
      {vatRules.state === 'ready' || vatRules.state === 'none' || vatRules.state === 'invalid' ? <RuleStatus rules={vatRules} label={t('electricity.vatRuleLabel')} /> : null}
      </>}
    </ToolPanel>
    <AiSourceCheckPanel member={member} loginTo={loginPath('/tien-dien')} toolId="tien-dien" domain="electricity" kinds={ELECTRICITY_KINDS} snapshot={ruleSnapshot(verified)} currentResult={mode === 'water' ? waterResult ? t('electricity.aiResult.water', { volume: water.cubicMeters, total: waterResult.total }) : '' : result ? t('electricity.aiResult.electricity', { kwh, total: result.total }) : ''} />
  </ToolBoard>
}
