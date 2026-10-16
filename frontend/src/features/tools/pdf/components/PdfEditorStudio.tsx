import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { FilePicker, toolPathOf, useToolsBranch } from '@/features/tools/hub'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import type { LoadingProgress } from '../hooks/useDocWorkspace'
import type { SideTab } from './DocSidePanel'
import { createEditorSample, type EditorSample } from '../services/editor-samples'

const PDF_TOOLS = ['edit-pdf', 'view-pdf', 'scan-to-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'convert-file', 'pdf-to-image', 'organize-pdf', 'pdf-password']
const EMPTY_TOOLS = [['fonts', 'text'], ['input-cursor-text', 'editText'], ['pencil', 'pen'], ['highlighter', 'highlight'], ['sticky', 'note'], ['cursor', 'select'], ['square', 'rect'], ['arrow-up-right', 'arrow']] as const
interface Props {
  children?: ReactNode
  hasPages: boolean
  loading: LoadingProgress | null
  onFiles: (files: File[]) => void
  grid: ReactNode
  toolbar: ReactNode
  panel: ReactNode
  preview: ReactNode
  toolHost: (element: HTMLDivElement | null) => void
  activeTab: SideTab
  onTab: (tab: SideTab) => void
  hasForms: boolean
  busy: boolean
}

/** The approved PDF reference: input/pages, editing/export and an interactive viewer. */
export function PdfEditorStudio({ children, hasPages, loading, onFiles, grid, toolbar, panel, preview, toolHost, activeTab, onTab, hasForms, busy }: Props) {
  const { t } = useTranslation('pdf')
  const { t: s } = useTranslation('pdf', { keyPrefix: 'editorStudio' })
  const { base } = useToolsBranch()
  const id = useId()
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const sample = async (kind: EditorSample) => {
    if (loading || busy || sampleBusy) return
    setSampleBusy(true); setSampleFailed(false)
    try { onFiles([await createEditorSample(kind)]) } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  return <ImageStudio toolId="edit-pdf" icon="file-earmark-pdf-fill" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')}
    category={{ title: s('category'), icon: 'file-earmark-pdf', path: '/tai-lieu-pdf', tools: PDF_TOOLS, relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <div className="cn-pdfeditor-studio">
      <nav className="cn-processing-nav cn-pdfeditor-nav" aria-label={s('functions')}>
        <button type="button" aria-pressed={activeTab === 'export'} onClick={() => onTab('export')}><Icon name="pencil-square" />{s('edit')}</button>
        <button type="button" aria-pressed={activeTab === 'decorate'} onClick={() => onTab('decorate')}><Icon name="journal-text" />{t('side.decorate')}</button>
        {hasForms ? <button type="button" aria-pressed={activeTab === 'form'} onClick={() => onTab('form')}><Icon name="ui-checks" />{t('side.form')}</button> : null}
        <button type="button" aria-pressed={activeTab === 'search'} onClick={() => onTab('search')}><Icon name="search" />{t('side.search')}</button>
        {(['sign', 'split-pdf', 'convert-file', 'compress-pdf', 'pdf-password'] as const).map((tool, index) => <Link key={tool} to={toolPathOf(base, tool)}><Icon name={['pen', 'scissors', 'arrow-left-right', 'file-earmark-zip', 'shield-lock'][index]} />{s(`nav.${tool}`)}</Link>)}
      </nav>
      <div className="cn-pdfeditor-columns">
        <section className="cn-idstudio-panel cn-convertstudio-upload cn-pdfeditor-input" aria-labelledby={`${id}-input`}>
          <h2 id={`${id}-input`}>1. {s('uploadTitle')}</h2>
          <FilePicker accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple title={s('drop')} hint={t('picker.pdfImage')} compact={hasPages} loading={loading} disabled={busy || sampleBusy || !!loading} onFiles={onFiles} />
          <p className="cn-idstudio-local"><Icon name="shield-check" />{s('local')}</p>
          {hasPages ? <div className="cn-pdfeditor-pages"><h3>{s('pagesTitle')}</h3><p className="cn-idstudio-note">{s('pagesHint')}</p>{grid}</div> : <div className="cn-pdfeditor-samples"><h3>{s('samplesTitle')}</h3><div>{(['invoice', 'contract', 'notes'] as const).map(kind => <button type="button" key={kind} disabled={sampleBusy || !!loading} onClick={() => void sample(kind)}><span aria-hidden="true"><Icon name="file-earmark-text" /><i /><i /><i /></span>{s(`samples.${kind}`)}</button>)}</div>{sampleBusy ? <p role="status">{s('sampleBusy')}</p> : null}{sampleFailed ? <p role="alert">{s('sampleFailed')}</p> : null}</div>}
        </section>
        <div className="cn-pdfeditor-center">
          <section className="cn-idstudio-panel cn-pdfeditor-tools" aria-labelledby={`${id}-tools`}><h2 id={`${id}-tools`}>2. {s('toolsTitle')}</h2>
            <div ref={toolHost} className="cn-pdfeditor-toolhost" />
            {!hasPages ? <><div className="cn-pdfeditor-empty-tools">{EMPTY_TOOLS.map(([icon, name]) => <button type="button" key={name} disabled><Icon name={icon} /><span>{t(`markup.tool.${name}`)}</span></button>)}</div><p className="cn-idstudio-note">{s('needFile')}</p></> : toolbar}
          </section>
          <section className="cn-idstudio-panel cn-pdfeditor-options" aria-labelledby={`${id}-options`}><h2 id={`${id}-options`}>3. {s('optionsTitle')}</h2>{panel}</section>
        </div>
        <section className="cn-idstudio-panel cn-pdfeditor-view" aria-labelledby={`${id}-preview`}><h2 id={`${id}-preview`}>4. {s('previewTitle')}</h2>
          {preview ?? <div className="cn-pdfeditor-empty-preview"><div className="cn-pdfeditor-paper" aria-hidden="true"><Icon name="file-earmark-pdf" /><span /><span /><span /><span /><span /><span /></div><strong>{s('emptyPreview')}</strong><p>{s('emptyHint')}</p></div>}
          <p className="cn-idstudio-note">{s(hasPages ? 'editHint' : 'previewHint')}</p>
        </section>
      </div>
    </div>
    {children}
  </ImageStudio>
}
