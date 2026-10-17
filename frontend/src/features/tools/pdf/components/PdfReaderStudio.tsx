import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ConfirmAction, Icon } from '@/components/ui'
import { FilePicker } from '@/features/tools/hub'
import type { LoadingProgress } from '../hooks/useDocWorkspace'
import { PdfQuickStudio } from './quick/PdfQuickStudio'

interface Props {
  loading: LoadingProgress | null
  count: number
  files: readonly string[]
  onFiles: (files: File[]) => void
  onReset: () => void
  reader: ReactNode
  panel: ReactNode
  panelOpen: boolean
  onPanelToggle: () => void
  editorPath: string
  editorState: unknown
  busy: boolean
}

/** Reader presentation only: DocToolsPage continues to own the shared document session. */
export function PdfReaderStudio({ loading, count, files, onFiles, onReset, reader, panel, panelOpen, onPanelToggle, editorPath, editorState, busy }: Props) {
  const { t } = useTranslation('pdf')
  const { t: s } = useTranslation('pdf', { keyPrefix: 'workflowStudio' })
  return <PdfQuickStudio kind="reader"><div className="cn-pdfreader-studio">
    <section className="cn-idstudio-panel cn-pdfreader-input"><h2>{s('readerInput')}</h2>
      <div className="cn-convertstudio-upload"><FilePicker accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple title={s('readerDrop')} hint={t('picker.pdfImage')} compact={count > 0} loading={loading} disabled={busy || Boolean(loading)} onFiles={onFiles} /></div>
      <div className="cn-pdfreader-summary"><Icon name="file-earmark-pdf" /><strong>{t('stage.pageCount', { count })}</strong>{files.length ? <ul>{files.map((name, index) => <li key={index}>{name}</li>)}</ul> : null}</div>
      <div className="cn-pdfreader-actions"><button type="button" className="btn btn-outline-primary" disabled={!count} aria-expanded={panelOpen} onClick={onPanelToggle}><Icon name="search" />{t('reader.searchExport')}</button><Link className="btn btn-primary" to={editorPath} state={editorState}><Icon name="pencil-square" />{t('reader.edit')}</Link><ConfirmAction title={t('toolbar.resetTitle')} description={t('toolbar.resetDescription')} confirmLabel={t('toolbar.resetConfirm')} danger onConfirm={onReset}>{({ onClick }) => <button type="button" className="btn btn-outline-secondary" disabled={!count || busy || Boolean(loading)} onClick={onClick}><Icon name="arrow-counterclockwise" />{t('toolbar.reset')}</button>}</ConfirmAction></div>
      <p className="cn-flowstudio-hint">{s('readerShortcut')}</p>
    </section>
    <section className="cn-idstudio-panel cn-pdfreader-view"><h2>{s('readerView')}</h2>{reader ?? <div className="cn-pdfreader-empty"><Icon name="file-earmark-pdf" /><strong>{s('readerEmpty')}</strong><p>{s('readerEmptyHint')}</p></div>}
      {panelOpen ? <div className="cn-pdfreader-panel">{panel}</div> : null}
    </section>
  </div></PdfQuickStudio>
}
