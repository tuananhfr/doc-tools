import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { formatRuleDate, ruleSnapshot, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { SaveResultBar, type SaveAdapter } from '@/features/cloud'
import { electricitySnapshot, parseElectricitySaved } from '../utils/electricity-saved'
import { electricityBill, parseElectricityRules, validateElectricityTiers, waterBill } from '../utils/electricity'
import { parseVatRule } from '../utils/vat-rule'
import { formatRuleLines, parseRuleLines } from '../utils/rule-lines'
import styles from './ElectricityPage.module.css'

// Thuế điện có gói `vat` riêng, nên lượt kiểm nguồn đọc cả hai.
const ELECTRICITY_KINDS = ['electricity', 'vat']
const KWH: NumberRule = { kind: 'decimal', min: 0, max: 1_000_000 }
const HOUSEHOLDS: NumberRule = { kind: 'integer', min: 1, max: 1000 }
const PERCENT: NumberRule = { kind: 'decimal', min: 0, max: 100 }
const WATER_RULES: Record<'cubicMeters' | 'price' | 'fee' | 'vat', NumberRule> = {
  cubicMeters: { kind: 'decimal', min: 0, max: 1_000_000 }, price: { kind: 'money', min: 0, max: 1_000_000 }, fee: PERCENT, vat: PERCENT,
}

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
  const parsed = parseRuleLines(lines, 'money')
  const tiers = parsed.ok ? validateElectricityTiers(parsed.lines.map((line) => ({ upTo: line.upTo, price: line.value }))) : null
  const kwhValue = readNumber(kwh, KWH)
  const vatValue = readNumber(vat, PERCENT)
  const householdValue = readNumber(households, HOUSEHOLDS)
  const result = tiers && kwhValue !== null && vatValue !== null && householdValue !== null ? electricityBill(kwhValue, tiers, vatValue, householdValue) : null
  const waterValues = { cubicMeters: readNumber(water.cubicMeters, WATER_RULES.cubicMeters), price: readNumber(water.price, WATER_RULES.price), fee: readNumber(water.fee, WATER_RULES.fee), vat: readNumber(water.vat, WATER_RULES.vat) }
  const waterResult = waterValues.cubicMeters !== null && waterValues.price !== null && waterValues.fee !== null && waterValues.vat !== null ? waterBill(waterValues.cubicMeters, waterValues.price, waterValues.fee, waterValues.vat) : null
  // "—" trơn từng khiến người dùng không biết sai ở đâu: nói ra lý do cụ thể nhất.
  const typedWrong = (text: string, value: number | null) => text.trim() !== '' && value === null
  const electricityHint = !parsed.ok ? t('electricity.errors.line', { line: parsed.line })
    : lines.trim() && !tiers ? t('electricity.errors.order')
      : typedWrong(kwh, kwhValue) || typedWrong(households, householdValue) || typedWrong(vat, vatValue) ? t('electricity.errors.inputs')
        : vat.trim() === '' ? t('electricity.errors.vat') : t('electricity.electricityHint')
  const waterHint = (Object.keys(waterValues) as (keyof typeof waterValues)[]).some((key) => typedWrong(water[key], waterValues[key])) ? t('electricity.errors.inputs') : t('electricity.waterHint')
  // Tiền hiển thị làm tròn tới đồng; tổng vẫn cộng từ số chưa làm tròn như cách hóa đơn tính.
  const money = (value: number) => formatNumber(Math.round(value))
  const updateLines = (value: string) => { setLines(value); setUsingVerified(false) }
  const applyVat = () => {
    if (!signedVat) return
    setVat(String(signedVat.percent))
    setAppliedVat(signedVat)
  }
  const applyVerified = () => {
    if (!verified) return
    setLines(formatRuleLines(verified.data.tiers.map((tier) => ({ upTo: tier.upTo, value: tier.price }))))
    setUsingVerified(true)
    applyVat()
  }
  const saveAdapter: SaveAdapter = {
    snapshot: () => electricitySnapshot({ mode, kwh, households, vat, lines, water }),
    restore: (payload) => {
      const saved = parseElectricitySaved(payload)
      if (!saved) return false
      // Reopened numbers are the person's own, even if they once came from the verified package.
      setMode(saved.mode); setKwh(saved.kwh); setHouseholds(saved.households); setVat(saved.vat); setLines(saved.lines); setWater(saved.water)
      setUsingVerified(false); setAppliedVat(null)
      return true
    },
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('electricity.resultLabel')}</p>
    <p className="erp-tool-result__value">{mode === 'water' ? waterResult ? t('shared.amount', { amount: formatNumber(Math.round(waterResult.total)) }) : '—' : result ? t('shared.amount', { amount: formatNumber(Math.round(result.total)) }) : '—'}</p>
    {mode === 'water' ? waterResult ? <p className="erp-tool-result__note">{t('electricity.waterBreakdown', { subtotal: money(waterResult.subtotal), fee: money(waterResult.fee), vat: money(waterResult.vat) })}</p> : <p className="erp-tool-result__note">{waterHint}</p> : <>
    {result ? <><p className="erp-tool-result__note">{t('electricity.electricityBreakdown', { subtotal: money(result.subtotal), percent: formatNumber(vatValue ?? 0), vat: money(result.vat) })}</p>
      <div className={styles.breakdown}><table className="table table-sm"><thead><tr><th>{t('electricity.table.upTo')}</th><th>{t('electricity.table.units')}</th><th>{t('electricity.table.price')}</th><th>{t('electricity.table.amount')}</th></tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}><td>{row.upTo ?? t('electricity.table.rest')}</td><td>{formatNumber(row.units)}</td><td>{formatNumber(row.price)}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div></> : <p className="erp-tool-result__note">{electricityHint}</p>}
    <p className="erp-tool-result__note">{usingVerified && verified ? t('electricity.tariffVerified', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('electricity.tariffManual')} {appliedVat ? t('electricity.vatVerified', { percent: formatNumber(appliedVat.percent), date: formatRuleDate(appliedVat.from.effectiveFrom), source: appliedVat.from.source.title }) : t('electricity.vatManual')} {t('electricity.notIncluded')}</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('shared.viewSource')}</a> : null}</>}
  </div>}>
    <ToolPanel title={t('electricity.panelTitle')}>
      <label className="erp-flow-field__label">{t('electricity.billType')}<Form.Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="electricity">{t('electricity.modes.electricity')}</option><option value="water">{t('electricity.modes.water')}</option></Form.Select></label>
      {mode === 'water' ? <div className="erp-tool-form__grid mt-3">{([
        ['cubicMeters', t('electricity.water.cubicMeters')], ['price', t('electricity.water.price')], ['fee', t('electricity.water.fee')], ['vat', t('shared.vatPercent')],
      ] as [keyof typeof water, string][]).map(([key, label]) => <NumberField key={key} label={label} rule={WATER_RULES[key]} value={water[key]} onChange={(value) => setWater((current) => ({ ...current, [key]: value }))} />)}</div> : <>
      <NumberField label={t('electricity.kwh')} rule={KWH} unit="kWh" value={kwh} onChange={setKwh} />
      <NumberField className="mt-3" label={t('electricity.households')} rule={HOUSEHOLDS} value={households} onChange={setHouseholds} />
      <label className="erp-flow-field__label mt-3">{t('electricity.tiers')}<Form.Control as="textarea" rows={7} placeholder={'50; 1.800\n100; 2.200\n*; 3.000'} value={lines} onChange={(event) => updateLines(event.target.value)} /></label>
      <NumberField className="mt-3" label={t('shared.vatPercent')} rule={PERCENT} unit="%" value={vat} onChange={(value) => { setVat(value); setAppliedVat(null) }} />
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>{t('electricity.applyTariff')}</Button>
        : signedVat ? <Button className="mt-3" variant="outline-secondary" onClick={applyVat}>{t('electricity.applyVat')}</Button> : null}
      <RuleStatus rules={electricityRules} label={t('electricity.ruleLabel')} noneText={t('electricity.ruleNone')} />
      {vatRules.state === 'ready' || vatRules.state === 'none' || vatRules.state === 'invalid' ? <RuleStatus rules={vatRules} label={t('electricity.vatRuleLabel')} /> : null}
      </>}
    </ToolPanel>
    <SaveResultBar member={member} toolId="tien-dien" adapter={saveAdapter} />
    <AiSourceCheckPanel member={member} loginTo={loginPath('/tien-dien')} toolId="tien-dien" domain="electricity" kinds={ELECTRICITY_KINDS} snapshot={ruleSnapshot(verified)} currentResult={mode === 'water' ? waterResult ? t('electricity.aiResult.water', { volume: water.cubicMeters, total: waterResult.total }) : '' : result ? t('electricity.aiResult.electricity', { kwh, total: result.total }) : ''} />
  </ToolBoard>
}
