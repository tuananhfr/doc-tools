import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { invoiceItemsCsv, invoiceItemsXlsx, parseInvoiceXml, type InvoiceSummary } from '../utils/invoice-xml'

export default function InvoiceXmlPage() {
  const { t } = useTranslation('vietnam')
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const open = async (file: File | undefined) => {
    setInvoice(null)
    setExportError('')
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError(t('invoice.errors.tooLarge')); return }
    try {
      setInvoice(parseInvoiceXml(await file.text()))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('invoice.errors.unreadable'))
    }
  }
  const download = () => {
    if (!invoice) return
    downloadOutput({ name: 'bang-ke-hoa-don.csv', blob: new Blob([invoiceItemsCsv(invoice)], { type: 'text/csv;charset=utf-8' }) })
  }
  const downloadXlsx = async () => {
    if (!invoice) return
    setExporting(true)
    setExportError('')
    try {
      downloadOutput({ name: 'bang-ke-hoa-don.xlsx', blob: await invoiceItemsXlsx(invoice) })
    } catch {
      setExportError(t('invoice.errors.xlsx'))
    } finally {
      setExporting(false)
    }
  }

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('invoice.resultLabel')}</p>
    <p className="erp-tool-result__value">{invoice ? invoice.number || t('invoice.noNumber') : '—'}</p>
    {invoice ? <>
      <p className="erp-tool-result__note">{t('invoice.series', { series: invoice.series || '—', date: invoice.date || '—' })}</p>
      <p className="erp-tool-result__note">{t('invoice.seller', { name: invoice.seller.name || '—', taxCode: invoice.seller.taxCode || t('invoice.noTaxCode') })}</p>
      <p className="erp-tool-result__note">{t('invoice.buyer', { name: invoice.buyer.name || '—', taxCode: invoice.buyer.taxCode || t('invoice.noTaxCode') })}</p>
      <p className="erp-tool-result__note">{t('invoice.amounts', { subtotal: formatNumber(invoice.subtotal), vat: formatNumber(invoice.vat) })}</p>
      <p className="erp-tool-result__note">{t('invoice.total', { total: formatNumber(invoice.total) })}</p>
      <p className="erp-tool-result__note">{t('invoice.signature', { signature: t(invoice.hasSignatureElement ? 'invoice.present' : 'invoice.notFound'), authority: invoice.authorityCode || t('invoice.notFound') })}</p>
      <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={() => void downloadXlsx()} disabled={exporting}>{t('invoice.downloadXlsx')}</button>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={download}>{t('invoice.downloadCsv')}</button>
      {exportError ? <p className="erp-tool-result__note" role="alert">{exportError}</p> : null}
    </> : <p className="erp-tool-result__note">{error || t('invoice.empty')}</p>}
    <p className="erp-tool-result__note mt-3">{t('invoice.disclaimer')}</p>
  </div>}>
    <ToolPanel title={t('invoice.panelTitle')}>
      <label className="erp-flow-field__label">{t('invoice.pickFile')}
        <Form.Control type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void open((event.target as HTMLInputElement).files?.[0])} />
      </label>
      {/* Số giữ trên một dòng, tên hàng được bẻ từ: cột Thành tiền không bị đẩy khuất trên màn hẹp; vẫn rộng quá thì khung cuộn ngang. */}
      {invoice ? <div className="table-responsive mt-3"><table className="table table-sm"><thead><tr><th>{t('invoice.columns.ordinal')}</th><th className="text-wrap">{t('invoice.columns.name')}</th><th className="text-end text-nowrap">{t('invoice.columns.quantity')}</th><th className="text-end text-nowrap">{t('invoice.columns.amount')}</th></tr></thead><tbody>
        {invoice.items.map((item, index) => <tr key={`${item.ordinal}-${index}`}>
          <td>{item.ordinal}</td>
          <td className="text-break">{item.name}{item.discount ? <span className="badge text-bg-secondary ms-2">{t('invoice.discount')}</span> : null}</td>
          <td className="text-end text-nowrap">{item.discount ? '—' : formatNumber(item.quantity)}</td>
          <td className="text-end text-nowrap">{formatNumber(item.amount)}</td>
        </tr>)}
      </tbody></table></div> : null}
    </ToolPanel>
  </ToolBoard>
}
