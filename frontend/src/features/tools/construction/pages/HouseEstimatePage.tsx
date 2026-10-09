import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { DEFAULT_FACTORS, estimateHouse, type FactorKey, type Factors } from '../utils/house-estimate'
import styles from './HouseEstimatePage.module.css'

const FIELDS: FactorKey[] = ['foundation', 'basement', 'ground', 'upper', 'rooftopRoom', 'terrace', 'roof', 'yard']
const INPUTS = ['floorArea', 'upperFloors', 'rooftopRoomArea', 'terraceArea', 'yardArea', 'basePrice', 'finishingPrice', 'pileCost'] as const
type InputKey = typeof INPUTS[number]
const AREA: NumberRule = { kind: 'decimal', min: 0, max: 1_000_000 }
const UNIT_PRICE: NumberRule = { kind: 'money', min: 0, max: 1e10 }
const INPUT_RULES: Record<InputKey, NumberRule> = {
  floorArea: AREA, upperFloors: { kind: 'integer', min: 0, max: 50 }, rooftopRoomArea: AREA, terraceArea: AREA, yardArea: AREA,
  basePrice: UNIT_PRICE, finishingPrice: UNIT_PRICE, pileCost: { kind: 'money', min: 0, max: 1e12 },
}
const FACTOR: NumberRule = { kind: 'decimal', min: 0, max: 400 }
const DEFAULT_FACTOR_TEXT = Object.fromEntries(FIELDS.map((key) => [key, String(DEFAULT_FACTORS[key])])) as Record<FactorKey, string>

export default function HouseEstimatePage() {
  const { t } = useTranslation('construction')
  const id = useId()
  const [values, setValues] = useState({ floorArea: '80', upperFloors: '2', rooftopRoomArea: '20', terraceArea: '40', yardArea: '0', basePrice: '', finishingPrice: '', pileCost: '' })
  const [factorText, setFactorText] = useState(DEFAULT_FACTOR_TEXT)
  const [turnkey, setTurnkey] = useState(false)
  // Ô đơn giá / cọc để trống nghĩa là 0 (chưa có báo giá phần đó); ô diện tích và số lầu thì phải điền.
  const numbers = Object.fromEntries(INPUTS.map((key) => [key, values[key].trim() === '' && INPUT_RULES[key].kind === 'money' ? 0 : readNumber(values[key], INPUT_RULES[key])])) as Record<InputKey, number | null>
  const factors = Object.fromEntries(FIELDS.map((key) => [key, readNumber(factorText[key], FACTOR)])) as Record<FactorKey, number | null>
  const badInput = INPUTS.find((key) => numbers[key] === null)
  const badFactor = FIELDS.find((key) => factors[key] === null)
  const n = (key: InputKey) => numbers[key] ?? 0
  const result = badInput || badFactor ? null : estimateHouse({
    floorArea: n('floorArea'), upperFloors: n('upperFloors'), rooftopRoomArea: n('rooftopRoomArea'),
    terraceArea: n('terraceArea'), yardArea: n('yardArea'), basePrice: n('basePrice'),
    finishingPrice: n('finishingPrice'), pileCost: n('pileCost'), finishingIncludesBase: turnkey, factors: factors as Factors,
  })
  // "Kiểm tra số liệu" trơn không nói ô nào sai — người dùng gõ "2,5" lầu không biết vì sao không ra kết quả.
  const problem = badInput ? t('houseEstimate.fixField', { field: t(`houseEstimate.fields.${badInput}`) })
    : badFactor ? t('houseEstimate.fixField', { field: t('houseEstimate.factorLabel', { label: t(`houseEstimate.parts.${badFactor}`) }) }) : t('houseEstimate.checkInput')
  const setValue = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('houseEstimate.result')}</p>
    <p className="erp-tool-result__value">{result && (n('basePrice') > 0 || n('finishingPrice') > 0) ? t('houseEstimate.money', { amount: formatNumber(Math.round(result.total)) }) : t('houseEstimate.enterPrice')}</p>
    {result ? <>
      <p className="erp-tool-result__note">{t('houseEstimate.convertedArea', { area: formatNumber(result.convertedArea) })}</p>
      <p className="erp-tool-result__note">{t('houseEstimate.costs', { base: formatNumber(result.baseCost), finishing: formatNumber(result.finishingCost), pile: formatNumber(result.pileCost) })}</p>
      <div className={styles.breakdown}><table className="table table-sm"><thead><tr><th>{t('houseEstimate.columns.item')}</th><th>{t('houseEstimate.columns.area')}</th><th>{t('houseEstimate.columns.factor')}</th><th>{t('houseEstimate.columns.converted')}</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.area)} m²</td><td>{row.factor}%</td><td>{formatNumber(row.convertedArea)} m²</td></tr>)}</tbody></table></div>
    </> : <p className="erp-tool-result__note" role="status">{problem}</p>}
    <p className="erp-tool-result__note">{t('houseEstimate.disclaimer')}</p>
  </div>}>
    <ToolPanel title={t('houseEstimate.title')}>
      <div className="erp-tool-form__grid">{INPUTS.map((key) => <NumberField key={key} label={t(`houseEstimate.fields.${key}`)} rule={INPUT_RULES[key]} value={values[key]} onChange={(value) => setValue(key, value)} />)}</div>
      <Form.Check className="mt-3" id={`${id}-turnkey`} label={t('houseEstimate.turnkey')} checked={turnkey} onChange={(event) => setTurnkey(event.target.checked)} />
      <details className="mt-3"><summary>{t('houseEstimate.editFactors')}</summary><div className="erp-tool-form__grid mt-3">{FIELDS.map((key) => <NumberField key={key} label={t('houseEstimate.factorLabel', { label: t(`houseEstimate.parts.${key}`) })} rule={FACTOR} unit="%" value={factorText[key]} onChange={(value) => setFactorText((current) => ({ ...current, [key]: value }))} />)}</div></details>
    </ToolPanel>
  </ToolBoard>
}
