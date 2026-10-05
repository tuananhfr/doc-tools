import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { compareUnitPrices } from '../utils/unit-price'

export default function UnitPricePage() {
  const ids = [useId(), useId(), useId(), useId()]
  const [values, setValues] = useState(['', '', '', ''])
  const [unit, setUnit] = useState('kg')
  const comparison = values.every(Boolean) ? compareUnitPrices({ price: Number(values[0]), quantity: Number(values[1]) }, { price: Number(values[2]), quantity: Number(values[3]) }) : null
  const setValue = (index: number, value: string) => setValues((current) => current.map((item, position) => position === index ? value : item))

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">So sánh theo đơn vị</p>
    <p className="erp-tool-result__value">{comparison ? comparison.cheaper === null ? 'Giá bằng nhau' : `Sản phẩm ${comparison.cheaper + 1} rẻ hơn` : '—'}</p>
    {comparison ? <>
      <p className="erp-tool-result__note">Sản phẩm 1: {formatNumber(comparison.items[0].perUnit)} đ/{unit}</p>
      <p className="erp-tool-result__note">Sản phẩm 2: {formatNumber(comparison.items[1].perUnit)} đ/{unit}</p>
      <p className="erp-tool-result__note">Chênh lệch {formatNumber(comparison.savingPercent)}% so với giá cao hơn.</p>
    </> : <p className="erp-tool-result__note">Nhập giá không âm và lượng dương cho cả hai sản phẩm, cùng một đơn vị.</p>}
  </div>}>
    <ToolPanel title="Hai sản phẩm">
      <div className="erp-tool-form__grid">
        {['Giá sản phẩm 1 (đ)', `Lượng sản phẩm 1 (${unit})`, 'Giá sản phẩm 2 (đ)', `Lượng sản phẩm 2 (${unit})`].map((label, index) => <label key={ids[index]} className="erp-flow-field__label" htmlFor={ids[index]}>{label}
          <Form.Control id={ids[index]} type="number" min="0" step="any" inputMode="decimal" value={values[index]} onChange={(event) => setValue(index, event.target.value)} />
        </label>)}
        <label className="erp-flow-field__label">Đơn vị lượng
          <Form.Select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="kg">kg</option><option value="lít">lít</option><option value="cái">cái</option></Form.Select>
        </label>
      </div>
    </ToolPanel>
  </ToolBoard>
}
