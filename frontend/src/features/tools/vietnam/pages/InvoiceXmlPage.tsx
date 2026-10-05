import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { invoiceItemsCsv, parseInvoiceXml, type InvoiceSummary } from '../utils/invoice-xml'

export default function InvoiceXmlPage() {
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null)
  const [error, setError] = useState('')
  const open = async (file: File | undefined) => {
    setInvoice(null)
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Tệp XML vượt quá 5 MB.'); return }
    try {
      setInvoice(parseInvoiceXml(await file.text()))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đọc được tệp XML.')
    }
  }
  const download = () => {
    if (!invoice) return
    downloadOutput({ name: 'bang-ke-hoa-don.csv', blob: new Blob([invoiceItemsCsv(invoice)], { type: 'text/csv;charset=utf-8' }) })
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Hóa đơn</p>
    <p className="erp-tool-result__value">{invoice ? invoice.number || 'Không có số' : '—'}</p>
    {invoice ? <>
      <p className="erp-tool-result__note">Ký hiệu: {invoice.series || '—'} · Ngày: {invoice.date || '—'}</p>
      <p className="erp-tool-result__note">Người bán: {invoice.seller.name || '—'} ({invoice.seller.taxCode || 'không có MST'})</p>
      <p className="erp-tool-result__note">Người mua: {invoice.buyer.name || '—'} ({invoice.buyer.taxCode || 'không có MST'})</p>
      <p className="erp-tool-result__note">Trước thuế: {formatNumber(invoice.subtotal)} đ · Thuế: {formatNumber(invoice.vat)} đ</p>
      <p className="erp-tool-result__note">Tổng thanh toán: {formatNumber(invoice.total)} đ</p>
      <p className="erp-tool-result__note">Thẻ chữ ký XML: {invoice.hasSignatureElement ? 'có' : 'không thấy'} · Mã cơ quan thuế: {invoice.authorityCode || 'không thấy'}</p>
      <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={download}>Tải bảng kê CSV</button>
    </> : <p className="erp-tool-result__note">{error || 'Chọn tệp XML để xem dữ liệu hóa đơn.'}</p>}
    <p className="erp-tool-result__note mt-3">Công cụ chỉ đọc nội dung XML; không xác thực chữ ký số hoặc tình trạng pháp lý của hóa đơn. Hãy tra cứu trên cổng chính thức trước khi sử dụng.</p>
  </div>}>
    <ToolPanel title="Tệp hóa đơn">
      <label className="erp-flow-field__label">Chọn tệp XML
        <Form.Control type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void open((event.target as HTMLInputElement).files?.[0])} />
      </label>
      {invoice ? <div className="table-responsive mt-3"><table className="table table-sm"><thead><tr><th>STT</th><th>Hàng hóa, dịch vụ</th><th>SL</th><th>Thành tiền</th></tr></thead><tbody>
        {invoice.items.map((item, index) => <tr key={`${item.ordinal}-${index}`}><td>{item.ordinal}</td><td>{item.name}</td><td>{formatNumber(item.quantity)}</td><td>{formatNumber(item.amount)}</td></tr>)}
      </tbody></table></div> : null}
    </ToolPanel>
  </ToolBoard>
}
