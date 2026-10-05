import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { DEFAULT_FACTORS, estimateHouse, type FactorKey, type Factors } from '../utils/house-estimate'

const FIELDS: { key: FactorKey; label: string }[] = [
  { key: 'foundation', label: 'Móng' }, { key: 'basement', label: 'Tầng hầm' }, { key: 'ground', label: 'Tầng trệt' },
  { key: 'upper', label: 'Mỗi lầu' }, { key: 'rooftopRoom', label: 'Tum' }, { key: 'terrace', label: 'Sân thượng không mái' },
  { key: 'roof', label: 'Mái' }, { key: 'yard', label: 'Sân trước/sau' },
]

export default function HouseEstimatePage() {
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
    <p className="erp-tool-result__label">Khái toán tham khảo</p>
    <p className="erp-tool-result__value">{result && (Number(values.basePrice) > 0 || Number(values.finishingPrice) > 0) ? `${formatNumber(Math.round(result.total))} đ` : 'Nhập đơn giá'}</p>
    {result ? <>
      <p className="erp-tool-result__note">Diện tích quy đổi: {formatNumber(result.convertedArea)} m²</p>
      <p className="erp-tool-result__note">Phần thô: {formatNumber(result.baseCost)} đ · Hoàn thiện hoặc trọn gói: {formatNumber(result.finishingCost)} đ · Cọc: {formatNumber(result.pileCost)} đ</p>
      <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Hạng mục</th><th>Diện tích</th><th>Hệ số</th><th>Quy đổi</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.area)} m²</td><td>{row.factor}%</td><td>{formatNumber(row.convertedArea)} m²</td></tr>)}</tbody></table></div>
    </> : <p className="erp-tool-result__note">Kiểm tra số liệu đã nhập.</p>}
    <p className="erp-tool-result__note">Hệ số là quy ước tham khảo trong tài liệu lưu trữ, không phải định mức nhà nước. Đối chiếu thiết kế và báo giá nhà thầu; chưa gồm thiết kế, giấy phép, nội thất rời hoặc phát sinh địa chất.</p>
  </div>}>
    <ToolPanel title="Diện tích và đơn giá của bạn">
      <div className="erp-tool-form__grid">{([
        ['floorArea', 'Diện tích sàn trệt (m²)'], ['upperFloors', 'Số lầu (không tính trệt)'], ['rooftopRoomArea', 'Diện tích tum (m²)'], ['terraceArea', 'Sân thượng không mái (m²)'],
        ['yardArea', 'Sân trước/sau (m²)'], ['basePrice', 'Đơn giá phần thô (đ/m²)'], ['finishingPrice', 'Đơn giá hoàn thiện hoặc trọn gói (đ/m²)'], ['pileCost', 'Chi phí cọc (đ)'],
      ] as [keyof typeof values, string][]).map(([key, label]) => <label className="erp-flow-field__label" key={key}>{label}<Form.Control type="number" min="0" step={key === 'upperFloors' ? '1' : 'any'} inputMode="decimal" value={values[key]} onChange={(event) => setValue(key, event.target.value)} /></label>)}</div>
      <Form.Check className="mt-3" id={`${id}-turnkey`} label="Đơn giá thứ hai là trọn gói, đã gồm phần thô" checked={turnkey} onChange={(event) => setTurnkey(event.target.checked)} />
      <details className="mt-3"><summary>Sửa hệ số theo báo giá nhà thầu</summary><div className="erp-tool-form__grid mt-3">{FIELDS.map(({ key, label }) => <label className="erp-flow-field__label" key={key}>{label} (%)<Form.Control type="number" min="0" max="400" step="any" value={factors[key]} onChange={(event) => setFactors((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div></details>
    </ToolPanel>
  </ToolBoard>
}
