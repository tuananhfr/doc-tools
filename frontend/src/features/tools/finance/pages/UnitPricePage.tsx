import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { NumberField, readNumber, ToolBoard, ToolPanel, type NumberRule } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { compareUnitPrices } from '../utils/unit-price'

const UNITS = ['kg', 'liter', 'piece'] as const
const PRICE: NumberRule = { kind: 'money', min: 0, max: 1e12 }
// Lượng 0 không chia được — chặn ngay ở ô thay vì để kết quả im lặng là "—".
const QUANTITY: NumberRule = { kind: 'decimal', min: 0.000001, max: 1e9 }
const RULES = [PRICE, QUANTITY, PRICE, QUANTITY]

export default function UnitPricePage() {
  const { t } = useTranslation('finance')
  const [values, setValues] = useState(['', '', '', ''])
  const [unitId, setUnitId] = useState<typeof UNITS[number]>('kg')
  const unit = t(`unitPrice.units.${unitId}`)
  const [price1, quantity1, price2, quantity2] = values.map((value, index) => readNumber(value, RULES[index]))
  const comparison = price1 !== null && quantity1 !== null && price2 !== null && quantity2 !== null ? compareUnitPrices({ price: price1, quantity: quantity1 }, { price: price2, quantity: quantity2 }) : null
  const setValue = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('unitPrice.resultLabel')}</p>
    <p className="erp-tool-result__value">{comparison ? comparison.cheaper === null ? t('unitPrice.equal') : t('unitPrice.cheaper', { index: comparison.cheaper + 1 }) : '—'}</p>
    {comparison ? <>
      <p className="erp-tool-result__note">{t('unitPrice.perUnit', { index: 1, amount: formatNumber(comparison.items[0].perUnit), unit })}</p>
      <p className="erp-tool-result__note">{t('unitPrice.perUnit', { index: 2, amount: formatNumber(comparison.items[1].perUnit), unit })}</p>
      <p className="erp-tool-result__note">{t('unitPrice.difference', { percent: formatNumber(comparison.savingPercent) })}</p>
    </> : <p className="erp-tool-result__note">{t('unitPrice.hint')}</p>}
  </div>}>
    <ToolPanel title={t('unitPrice.panelTitle')}>
      <div className="erp-tool-form__grid">
        {[t('unitPrice.price', { index: 1 }), t('unitPrice.quantity', { index: 1, unit }), t('unitPrice.price', { index: 2 }), t('unitPrice.quantity', { index: 2, unit })].map((label, index) => <NumberField key={index} label={label} rule={RULES[index]} unit={index % 2 ? unit : 'đ'} value={values[index]} onChange={(value) => setValue(index, value)} />)}
        <label className="erp-flow-field__label">{t('unitPrice.unit')}
          <Form.Select value={unitId} onChange={(event) => setUnitId(event.target.value as typeof unitId)}>{UNITS.map((id) => <option key={id} value={id}>{t(`unitPrice.units.${id}`)}</option>)}</Form.Select>
        </label>
      </div>
    </ToolPanel>
  </ToolBoard>
}
