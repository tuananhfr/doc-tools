import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { NumberField, readNumber, ToolBoard, ToolPanel, WorkspaceGuide, type NumberRule } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { formatNumber } from '@/utils/format'
import { compareUnitPrices } from '../utils/unit-price'

const UNITS = ['kg', 'liter', 'piece'] as const
const PRICE: NumberRule = { kind: 'money', min: 0, max: 1e12 }
// Lượng 0 không chia được — chặn ngay ở ô thay vì để kết quả im lặng là "—".
const QUANTITY: NumberRule = { kind: 'decimal', min: 0.000001, max: 1e9 }
const RULES = [PRICE, QUANTITY, PRICE, QUANTITY]

export default function UnitPricePage() {
  const { t } = useTranslation('finance')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.unitPrice' })
  const [values, setValues] = useState(['', '', '', ''])
  const [unitId, setUnitId] = useState<typeof UNITS[number]>('kg')
  const unit = t(`unitPrice.units.${unitId}`)
  const [price1, quantity1, price2, quantity2] = values.map((value, index) => readNumber(value, RULES[index]))
  const comparison = price1 !== null && quantity1 !== null && price2 !== null && quantity2 !== null ? compareUnitPrices({ price: price1, quantity: quantity1 }, { price: price2, quantity: quantity2 }) : null
  const setValue = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard className="cn-unitprice-workspace" layout="compact" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('stepUnit'), studio('stepInput'), studio('stepCompare')]} tip={studio('tip')} /></div>} side={<div className="erp-tool-result cn-unitprice-result" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="tags" /></span><div><h2>{t('unitPrice.resultLabel')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className="cn-unitprice-winner">{!comparison ? <Icon name="basket2" /> : <Icon name="check2-circle" />}<p className="erp-tool-result__value">{comparison ? comparison.cheaper === null ? t('unitPrice.equal') : t('unitPrice.cheaper', { index: comparison.cheaper + 1 }) : '—'}</p></div>
    {comparison ? <>
      <p className="cn-unitprice-per-unit">{t('unitPrice.perUnit', { index: 1, amount: formatNumber(comparison.items[0].perUnit), unit })}</p>
      <p className="cn-unitprice-per-unit">{t('unitPrice.perUnit', { index: 2, amount: formatNumber(comparison.items[1].perUnit), unit })}</p>
      <p className="erp-tool-result__note">{t('unitPrice.difference', { percent: formatNumber(comparison.savingPercent) })}</p>
    </> : <p className="erp-tool-result__note">{t('unitPrice.hint')}</p>}
  </div>}>
    <ToolPanel title={t('unitPrice.panelTitle')} actions={<span className="cn-studio-small-icon"><Icon name="basket2" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
        <label className="erp-flow-field__label">{t('unitPrice.unit')}
          <Form.Select value={unitId} onChange={(event) => setUnitId(event.target.value as typeof unitId)}>{UNITS.map((id) => <option key={id} value={id}>{t(`unitPrice.units.${id}`)}</option>)}</Form.Select>
        </label>
      <div className="cn-unitprice-products">{[0, 1].map(product => <fieldset className="cn-unitprice-product" key={product}><legend><Icon name="bag" />{studio('product', { index: product + 1 })}</legend><NumberField label={t('unitPrice.price', { index: product + 1 })} rule={PRICE} unit="đ" value={values[product * 2]} onChange={value => setValue(product * 2, value)} /><NumberField className="mt-3" label={t('unitPrice.quantity', { index: product + 1, unit })} rule={QUANTITY} unit={unit} value={values[product * 2 + 1]} onChange={value => setValue(product * 2 + 1, value)} /></fieldset>)}</div>
    </ToolPanel>
  </ToolBoard>
}
