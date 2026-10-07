import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatNumber } from '@/utils/format'
import { invoiceItemsCsv, parseInvoiceXml, type InvoiceSummary } from '../utils/invoice-xml'

export default function InvoiceXmlPage() {
  const { t } = useTranslation('vietnam')
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null)
  const [error, setError] = useState('')
  const open = async (file: File | undefined) => {
    setInvoice(null)
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
      <button type="button" className="btn btn-outline-secondary btn-sm mt-2" onClick={download}>{t('invoice.downloadCsv')}</button>
    </> : <p className="erp-tool-result__note">{error || t('invoice.empty')}</p>}
    <p className="erp-tool-result__note mt-3">{t('invoice.disclaimer')}</p>
  </div>}>
    <ToolPanel title={t('invoice.panelTitle')}>
      <label className="erp-flow-field__label">{t('invoice.pickFile')}
        <Form.Control type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void open((event.target as HTMLInputElement).files?.[0])} />
      </label>
      {invoice ? <div className="table-responsive mt-3"><table className="table table-sm"><thead><tr><th>{t('invoice.columns.ordinal')}</th><th>{t('invoice.columns.name')}</th><th>{t('invoice.columns.quantity')}</th><th>{t('invoice.columns.amount')}</th></tr></thead><tbody>
        {invoice.items.map((item, index) => <tr key={`${item.ordinal}-${index}`}><td>{item.ordinal}</td><td>{item.name}</td><td>{formatNumber(item.quantity)}</td><td>{formatNumber(item.amount)}</td></tr>)}
      </tbody></table></div> : null}
    </ToolPanel>
  </ToolBoard>
}
