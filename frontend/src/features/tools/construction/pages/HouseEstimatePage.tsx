import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { DEFAULT_FACTORS, estimateHouse, type FactorKey, type Factors } from '../utils/house-estimate'

const FIELDS: FactorKey[] = ['foundation', 'basement', 'ground', 'upper', 'rooftopRoom', 'terrace', 'roof', 'yard']
const INPUTS = ['floorArea', 'upperFloors', 'rooftopRoomArea', 'terraceArea', 'yardArea', 'basePrice', 'finishingPrice', 'pileCost'] as const

export default function HouseEstimatePage() {
  const { t } = useTranslation('construction')
  const id = useId()
  const [values, setValues] = useState({ floorArea: '80', upperFloors: '2', rooftopRoomArea: '20', terraceArea: '40', yardArea: '0', basePrice: '', finishingPrice: '', pileCost: '' })
  const [factors, setFactors] = useState<Factors>({ ...DEFAULT_FACTORS })
  const [turnkey, setTurnkey] = useState(false)
  const result = estimateHouse({
    floorArea: Number(values.floorArea), upperFloors: Number(values.upperFloors), rooftopRoomArea: Number(values.rooftopRoomArea),
    terraceArea: Number(values.terraceArea), yardArea: Number(values.yardArea), basePrice: Number(values.basePrice),
    finishingPrice: Number(values.finishingPrice), pileCost: Number(values.pileCost), finishingIncludesBase: turnkey, factors,
  })
  const setValue = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('houseEstimate.result')}</p>
    <p className="erp-tool-result__value">{result && (Number(values.basePrice) > 0 || Number(values.finishingPrice) > 0) ? t('houseEstimate.money', { amount: formatNumber(Math.round(result.total)) }) : t('houseEstimate.enterPrice')}</p>
    {result ? <>
      <p className="erp-tool-result__note">{t('houseEstimate.convertedArea', { area: formatNumber(result.convertedArea) })}</p>
      <p className="erp-tool-result__note">{t('houseEstimate.costs', { base: formatNumber(result.baseCost), finishing: formatNumber(result.finishingCost), pile: formatNumber(result.pileCost) })}</p>
      <div className="table-responsive"><table className="table table-sm"><thead><tr><th>{t('houseEstimate.columns.item')}</th><th>{t('houseEstimate.columns.area')}</th><th>{t('houseEstimate.columns.factor')}</th><th>{t('houseEstimate.columns.converted')}</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.area)} m²</td><td>{row.factor}%</td><td>{formatNumber(row.convertedArea)} m²</td></tr>)}</tbody></table></div>
    </> : <p className="erp-tool-result__note">{t('houseEstimate.checkInput')}</p>}
    <p className="erp-tool-result__note">{t('houseEstimate.disclaimer')}</p>
  </div>}>
    <ToolPanel title={t('houseEstimate.title')}>
      <div className="erp-tool-form__grid">{INPUTS.map((key) => <label className="erp-flow-field__label" key={key}>{t(`houseEstimate.fields.${key}`)}<Form.Control type="number" min="0" step={key === 'upperFloors' ? '1' : 'any'} inputMode="decimal" value={values[key]} onChange={(event) => setValue(key, event.target.value)} /></label>)}</div>
      <Form.Check className="mt-3" id={`${id}-turnkey`} label={t('houseEstimate.turnkey')} checked={turnkey} onChange={(event) => setTurnkey(event.target.checked)} />
      <details className="mt-3"><summary>{t('houseEstimate.editFactors')}</summary><div className="erp-tool-form__grid mt-3">{FIELDS.map((key) => <label className="erp-flow-field__label" key={key}>{t('houseEstimate.factorLabel', { label: t(`houseEstimate.parts.${key}`) })}<Form.Control type="number" min="0" max="400" step="any" value={factors[key]} onChange={(event) => setFactors((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></details>
    </ToolPanel>
  </ToolBoard>
}
