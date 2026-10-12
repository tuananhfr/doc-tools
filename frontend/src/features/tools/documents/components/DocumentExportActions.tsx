import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput } from '@/features/tools/hub/utils/flow-output'
import type { PrintDocument } from '../types/print-document'
import { documentFileStem } from '../types/print-document'

export function DocumentExportActions({ build, disabled = false }: { build: () => PrintDocument | Promise<PrintDocument>; disabled?: boolean }) {
  const { t } = useTranslation('documents')
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null), [error, setError] = useState('')
  const run = async (format: 'pdf' | 'docx') => {
    setBusy(format); setError('')
    try {
      const document = await build()
      const blob = format === 'pdf' ? await (await import('../services/document-pdf')).documentPdf(document) : await (await import('../services/document-docx')).documentDocx(document)
      downloadOutput({ name: documentFileStem(document.name) + '.' + format, blob })
    } catch { setError(t('shared.exportFailed')) }
    finally { setBusy(null) }
  }
  return <div className="cn-document-export">
    <div className="d-flex gap-2 flex-wrap"><Button disabled={disabled || busy !== null} onClick={() => void run('pdf')}>{busy === 'pdf' ? t('shared.exporting') : t('shared.downloadPdf')}</Button><Button variant="outline-primary" disabled={disabled || busy !== null} onClick={() => void run('docx')}>{busy === 'docx' ? t('shared.exporting') : t('shared.downloadDocx')}</Button><Button variant="outline-secondary" disabled={disabled || busy !== null} onClick={() => window.print()}>{t('shared.print')}</Button></div>
    {error ? <p className="erp-tool-form__error mt-2" role="alert">{error}</p> : null}
  </div>
}
