import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { compareUnitPrices } from '../utils/unit-price'

const UNITS = ['kg', 'liter', 'piece'] as const

export default function UnitPricePage() {
  const { t } = useTranslation('finance')
  const ids = [useId(), useId(), useId(), useId()]
  const [values, setValues] = useState(['', '', '', ''])
  const [unitId, setUnitId] = useState<typeof UNITS[number]>('kg')
  const unit = t(`unitPrice.units.${unitId}`)
  const comparison = values.every(Boolean) ? compareUnitPrices({ price: Number(values[0]), quantity: Number(values[1]) }, { price: Number(values[2]), quantity: Number(values[3]) }) : null
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
        {[t('unitPrice.price', { index: 1 }), t('unitPrice.quantity', { index: 1, unit }), t('unitPrice.price', { index: 2 }), t('unitPrice.quantity', { index: 2, unit })].map((label, index) => <label key={ids[index]} className="erp-flow-field__label" htmlFor={ids[index]}>{label}
          <Form.Control id={ids[index]} type="number" min="0" step="any" inputMode="decimal" value={values[index]} onChange={(event) => setValue(index, event.target.value)} />
        </label>)}
        <label className="erp-flow-field__label">{t('unitPrice.unit')}
          <Form.Select value={unitId} onChange={(event) => setUnitId(event.target.value as typeof unitId)}>{UNITS.map((id) => <option key={id} value={id}>{t(`unitPrice.units.${id}`)}</option>)}</Form.Select>
        </label>
      </div>
    </ToolPanel>
  </ToolBoard>
}
