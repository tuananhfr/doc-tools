import { useEffect, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { fetchVerifiedRules, type VerifiedRulePackage } from '@/features/tools/rules/services/signed-rules'
import { ByoAiPanel } from '@/features/tools/byoai/components/ByoAiPanel'
import { convertAddress, indexAddressMappings, parseAddressMappings, validateAddressMappings, type AddressMapping } from '../utils/address-conversion'

const csvField = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`

export default function AddressConversionPage() {
  const [addresses, setAddresses] = useState('')
  const [mappingText, setMappingText] = useState('')
  const [verified, setVerified] = useState<VerifiedRulePackage<{ wards: AddressMapping[] }> | null>(null)
  const [usingVerified, setUsingVerified] = useState(false)
  useEffect(() => { void fetchVerifiedRules<{ wards: AddressMapping[] }>('addresses').then((item) => { if (item && validateAddressMappings(item.data?.wards)) setVerified(item) }).catch(() => undefined) }, [])
  const manualMappings = useMemo(() => parseAddressMappings(mappingText), [mappingText])
  const mappings = usingVerified && verified ? verified.data.wards : manualMappings
  const index = useMemo(() => mappings ? indexAddressMappings(mappings) : null, [mappings])
  const lines = addresses.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 500)
  const results = index ? lines.map((line) => convertAddress(line, index)) : []
  const matched = results.filter((item) => item.status === 'matched').length
  const applyVerified = () => {
    if (!verified) return
    setUsingVerified(true)
  }
  const download = () => {
    const csv = '\ufeff' + [['Địa chỉ cũ', 'Địa chỉ đề xuất', 'Trạng thái'], ...results.map((row) => [row.input, row.output, row.status])].map((row) => row.map(csvField).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'doi-dia-chi.csv'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Đối chiếu địa chỉ</p>
    <p className="erp-tool-result__value">{matched}/{lines.length} khớp đủ cấp</p>
    <p className="erp-tool-result__note">Chỉ đổi khi xã/phường, huyện và tỉnh cũ cùng khớp một dòng dữ liệu. Dòng không khớp được giữ nguyên để kiểm tra thủ công.</p>
    {results.length ? <><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Địa chỉ cũ</th><th>Đề xuất</th><th>Trạng thái</th></tr></thead><tbody>{results.map((row, index) => <tr key={index}><td>{row.input}</td><td>{row.output}</td><td>{row.status === 'matched' ? 'Khớp đủ cấp' : row.status === 'ambiguous' ? 'Trùng dữ liệu' : 'Chưa khớp'}</td></tr>)}</tbody></table></div><Button variant="outline-secondary" onClick={download}>Tải CSV</Button></> : null}
    <p className="erp-tool-result__note mt-3">{usingVerified && verified ? `Bộ đối chiếu có chữ ký, hiệu lực từ ${verified.effectiveFrom}. Nguồn: ${verified.source.title}.` : 'Bảng đối chiếu do bạn nhập; chưa được hệ thống xác minh.'} Xác nhận địa chỉ cuối cùng với nơi tiếp nhận hồ sơ.</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">Xem nguồn dữ liệu</a> : null}
  </div>}>
    <ToolPanel title="Địa chỉ cũ và bảng đối chiếu">
      <label className="erp-flow-field__label">Mỗi dòng một địa chỉ, theo thứ tự “số nhà, xã/phường, huyện, tỉnh”<Form.Control as="textarea" rows={6} maxLength={100000} value={addresses} onChange={(event) => setAddresses(event.target.value)} placeholder="12 Lê Lợi, Phường A, Quận B, Tỉnh C" /></label>
      <label className="erp-flow-field__label mt-3">Mỗi dòng đối chiếu tự nhập: “tỉnh cũ|huyện cũ|xã cũ|tỉnh mới|xã mới”<Form.Control as="textarea" rows={6} maxLength={1000000} value={mappingText} onChange={(event) => { setMappingText(event.target.value); setUsingVerified(false) }} /></label>
      {manualMappings === null ? <p role="alert">Bảng đối chiếu sai định dạng hoặc có dòng cũ bị trùng.</p> : null}
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={applyVerified}>Áp dụng bảng đối chiếu đã ký</Button> : <p className="mt-3">Chưa có bộ đối chiếu địa chỉ đã ký, còn hiệu lực trên hệ thống.</p>}
    </ToolPanel>
    <ByoAiPanel toolId="doi-dia-chi" domain="addresses" snapshot={usingVerified && verified ? verified.digest : null} checkedAt={usingVerified && verified ? verified.source.retrievedAt : null} sources={usingVerified && verified ? [verified.source.url] : []} currentResult={results.map((row) => `${row.input} → ${row.output}`).join('\n')} />
  </ToolBoard>
}
