import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatRuleDate } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { ByoAiPanel } from '@/features/tools/byoai/components/ByoAiPanel'
import { convertAddress, indexAddressRules, parseAddressMappings, parseAddressRules, type AddressResult } from '../utils/address-conversion'

const csvField = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`

function statusLabel(row: AddressResult): string {
  if (row.status === 'full') return 'Đổi đủ'
  if (row.status === 'province') return 'Chỉ đổi tỉnh'
  if (row.status === 'ambiguous') return `Cần chọn tay: ${row.options.join(' hoặc ')}`
  return 'Không nhận ra tỉnh'
}

export default function AddressConversionPage() {
  const [addresses, setAddresses] = useState('')
  const [mappingText, setMappingText] = useState('')
  const [usingVerified, setUsingVerified] = useState(false)
  const addressRules = useSignedRules('addresses', parseAddressRules)
  const verified = addressRules.state === 'ready' ? addressRules.current : null
  const manualRules = useMemo(() => parseAddressMappings(mappingText), [mappingText])
  const rules = usingVerified && verified ? verified.data : manualRules
  const index = useMemo(() => rules ? indexAddressRules(rules) : null, [rules])
  const lines = addresses.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 500)
  const results = index ? lines.map((line) => convertAddress(line, index)) : []
  const full = results.filter((item) => item.status === 'full').length
  const download = () => {
    const csv = '﻿' + [['Địa chỉ cũ', 'Địa chỉ đề xuất', 'Trạng thái', 'Cấp huyện đã bỏ'], ...results.map((row) => [row.input, row.output, statusLabel(row), row.droppedDistrict])].map((row) => row.map(csvField).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'doi-dia-chi.csv'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Đối chiếu địa chỉ</p>
    <p className="erp-tool-result__value">{full}/{lines.length} đổi đủ</p>
    <p className="erp-tool-result__note">Tỉnh được nhận ra ở bất kỳ đoạn nào, kể cả viết tắt (TP.HCM, HN…). Cấp huyện bị bỏ. Xã/phường chỉ đổi khi dữ liệu chỉ ra đúng một xã mới; xã cũ bị tách thì liệt kê để bạn chọn.</p>
    {results.length ? <><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Địa chỉ cũ</th><th>Đề xuất</th><th>Trạng thái</th></tr></thead><tbody>{results.map((row, at) => <tr key={at}><td>{row.input}</td><td>{row.output}</td><td>{statusLabel(row)}</td></tr>)}</tbody></table></div><Button variant="outline-secondary" onClick={download}>Tải CSV</Button></> : null}
    <p className="erp-tool-result__note mt-3">{usingVerified && verified ? `Bộ đối chiếu có chữ ký, hiệu lực từ ${formatRuleDate(verified.effectiveFrom)}. Nguồn: ${verified.source.title}.` : 'Bảng đối chiếu do bạn nhập; chưa được hệ thống xác minh.'} Xác nhận địa chỉ cuối cùng với nơi tiếp nhận hồ sơ.</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">Xem nguồn dữ liệu</a> : null}
  </div>}>
    <ToolPanel title="Địa chỉ cũ và bảng đối chiếu">
      <label className="erp-flow-field__label">Mỗi dòng một địa chỉ, các cấp cách nhau bằng dấu phẩy<Form.Control as="textarea" rows={6} maxLength={100000} value={addresses} onChange={(event) => setAddresses(event.target.value)} placeholder="12 Lê Lợi, Phường A, Quận B, Tỉnh C" /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={() => setUsingVerified(true)} disabled={usingVerified}>{usingVerified ? 'Đang dùng bảng đối chiếu đã ký' : 'Áp dụng bảng đối chiếu đã ký'}</Button> : null}
      <RuleStatus rules={addressRules} label="bảng đối chiếu địa chỉ" noneText="Chưa có bộ đối chiếu địa chỉ đã ký, còn hiệu lực trên hệ thống." />
      <label className="erp-flow-field__label mt-3">Hoặc tự nhập, mỗi dòng: “tỉnh cũ|huyện cũ|xã cũ|tỉnh mới|xã mới”<Form.Control as="textarea" rows={6} maxLength={1000000} value={mappingText} onChange={(event) => { setMappingText(event.target.value); setUsingVerified(false) }} /></label>
      {manualRules === null ? <p role="alert">Bảng đối chiếu sai định dạng (mỗi dòng đủ 5 phần, mỗi phần tối đa 150 ký tự) hoặc có tỉnh cũ được ghi vào hai tỉnh mới khác nhau.</p> : null}
    </ToolPanel>
    <ByoAiPanel toolId="doi-dia-chi" domain="addresses" snapshot={usingVerified && verified ? verified.digest : null} checkedAt={usingVerified && verified ? verified.source.retrievedAt : null} sources={usingVerified && verified ? [verified.source.url] : []} currentResult={results.map((row) => `${row.input} → ${row.output}`).join('\n')} />
  </ToolBoard>
}
