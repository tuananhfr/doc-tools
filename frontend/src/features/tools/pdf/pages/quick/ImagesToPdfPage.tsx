import { useEffect, useId, useMemo, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { SaveToHostButton } from '@/features/embed'
import { downloadOutput, FilePicker, ToolLeaveGuard, useFlowRun } from '@/features/tools/hub'
import { useAutomaticFlow } from '@/features/tools/hub/hooks/useAutomaticFlow'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { FlowProgress } from '@/features/tools/hub/components/flow/FlowProgress'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { CameraCapture } from '@/features/tools/image'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useMobileImageReveal } from '@/features/tools/image/hooks/useMobileImageReveal'
import { formatFileSize } from '@/utils/format'
import { TextPdfPreview } from '../../components/quick/TextPdfPreview'
import { DocumentPagePreview } from '../../components/quick/DocumentPagePreview'
import { DEFAULT_OCR_OPTIONS } from '../../types/ocr-profile.types'
import { useQuickSources, type QuickItem, type QuickKind } from '../../hooks/useQuickSources'
import { imagesToPdfTask } from '../../services/quick-tasks'
import type { ImageSheet, Paper } from '../../types/doc-tools.types'
import { DEFAULT_SHEET } from '../../utils/image-sheet'
import type { FlowResult } from '@/features/tools/hub'
import { OcrTextEditor } from '../../components/quick/OcrTextEditor'
import { autoScanDocument } from '../../services/document-scan'
import type { OcrQualityFlag } from '../../types/ocr-result.types'

const ACCEPT: readonly QuickKind[] = ['image']
const PAPERS: Paper[] = ['a4', 'a3', 'fit']
const RELATED = ['scan-to-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'edit-pdf', 'organize-pdf', 'convert-file', 'pdf-to-image', 'ocr']
const NAVIGATION = ['scan-to-pdf', 'image-to-text', 'ocr', 'convert-image']

/** Accepted images are aligned, recognized and exported automatically; preview is the actual PDF. */
export default function ImagesToPdfPage() {
  useTranslation('ocr')
  const { t } = useTranslation('pdf')
  const { t: s } = useTranslation('pdf', { keyPrefix: 'imagesPdfStudio' })
  const { t: scanText } = useTranslation('pdf', { keyPrefix: 'documentScan' })
  const { t: common } = useTranslation('common')
  const { t: imageText } = useTranslation('image')
  const quick = useQuickSources({ accept: ACCEPT, multiple: true }), run = useFlowRun()
  const [imageFallback, setImageFallback] = useState(false)
  const [textEditor, setTextEditor] = useState(false), [textSaving, setTextSaving] = useState(false)
  const [edited, setEdited] = useState<{ base: FlowResult; value: FlowResult } | null>(null)
  const ids = useId()
  const [sheet, setSheet] = useState<ImageSheet>(DEFAULT_SHEET), [camera, setCamera] = useState(false)
  const [scans, setScans] = useState<Record<string, { item: QuickItem }>>({})
  const [autoDone, setAutoDone] = useState<Record<string, true>>({})
  const [scanQuality, setScanQuality] = useState<Record<string, OcrQualityFlag[]>>({})
  const autoItem = quick.items.find(item => !autoDone[item.source.id])
  const scanItems = useMemo(() => quick.items.map(item => scans[item.source.id]?.item ?? item), [quick.items, scans])
  const count = quick.items.length, busy = run.state.phase === 'running'
  const baseResult = run.state.phase === 'done' ? run.state.result : null
  const result = baseResult && edited?.base === baseResult ? edited.value : baseResult
  const inputKey = JSON.stringify(quick.items.map(item => item.source.id))
  const key = JSON.stringify([scanItems.map(item => item.source.id), sheet, imageFallback])
  const task = () => imagesToPdfTask(scanItems, sheet, imageFallback ? undefined : { options: DEFAULT_OCR_OPTIONS, layout: 'text' })
  const pending = useAutomaticFlow(run, key, count > 0 && !autoItem && quick.loading === null, task)
  const locked = busy || pending || quick.loading !== null || textSaving || Boolean(autoItem)
  useMobileImageReveal(quick.items.map(item => item.source.id), '.cn-imagespdf-preview')
  useEffect(() => { setEdited(null); setTextEditor(false) }, [key])
  useEffect(() => { setImageFallback(false) }, [inputKey])
  useEffect(() => {
    const currentIds = new Set(quick.items.map(item => item.source.id))
    setScans(current => Object.keys(current).every(id => currentIds.has(id)) ? current : Object.fromEntries(Object.entries(current).filter(([id]) => currentIds.has(id))))
    setAutoDone(current => Object.keys(current).every(id => currentIds.has(id)) ? current : Object.fromEntries(Object.entries(current).filter(([id]) => currentIds.has(id))))
    setScanQuality(current => Object.keys(current).every(id => currentIds.has(id)) ? current : Object.fromEntries(Object.entries(current).filter(([id]) => currentIds.has(id))))
  }, [quick.items])
  useEffect(() => {
    if (!autoItem) return
    const abort = new AbortController(), id = autoItem.source.id
    void autoScanDocument(autoItem, abort.signal, flags => { if (!abort.signal.aborted) setScanQuality(current => ({ ...current, [id]: flags })) }).then(scan => {
      if (abort.signal.aborted) return
      if (scan) setScans(current => ({ ...current, [id]: { item: scan.item } }))
      setAutoDone(current => ({ ...current, [id]: true }))
    }).catch(() => {
      if (!abort.signal.aborted) setAutoDone(current => ({ ...current, [id]: true }))
    })
    return () => abort.abort()
  }, [autoItem])
  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void quick.addFiles(files) } }
  const save = () => {
    if (!result || locked) return
    downloadOutput(result.output); recordQualityEvent('download', 'scan-to-pdf')
  }
  return <ImageStudio automatic toolId="scan-to-pdf" icon="file-earmark-pdf-fill" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')} navigation={NAVIGATION}
    category={{ title: s('category'), icon: 'file-earmark-pdf', path: '/tai-lieu-pdf', tools: RELATED, relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={busy || count > 0} />
    <div className="cn-idstudio-editor cn-imagespdf-editor cn-imagespdf-editor--automatic">
      <section className="cn-idstudio-panel cn-convertstudio-upload cn-imagespdf-upload" aria-labelledby={`${ids}-upload`}>
        <h2 id={`${ids}-upload`}>1. {s('uploadTitle')}</h2>
        <FilePicker accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple title={s('drop')} hint={t('picker.image')} compact={count > 0} loading={quick.loading} disabled={locked} onFiles={addFiles}
          pickLabel={imageText('idPhotoStudio.upload')} extra={<Button variant="outline-primary" disabled={locked} onClick={() => setCamera(true)}><Icon name="camera" />{t('imagesToPdf.camera')}</Button>} />
        <fieldset className="cn-imagespdf-paper-choice" disabled={locked}><legend>{t('sheet.paper')}</legend><div>{PAPERS.map(paper => <button key={paper} type="button" aria-pressed={sheet.paper === paper} onClick={() => setSheet(current => ({ ...current, paper }))}>{paper === 'fit' ? t('sheet.fit') : paper.toUpperCase()}</button>)}</div></fieldset>
        {count ? <details className="cn-imagespdf-files"><summary>{common('fileList.title')} ({count})</summary><FileList compact files={quick.items.map(({ source }) => ({ id: source.id, name: source.name, size: source.size, icon: 'file-earmark-image', thumbnail: quick.thumbnails[source.id] }))} disabled={locked} onRemove={quick.remove} onMove={quick.move} onClear={quick.clear} /></details> : null}
        {Object.values(scanQuality).some(flags => flags.includes('blur') || flags.includes('low-resolution')) ? <p className="cn-idstudio-note cn-imagespdf-quality-hint" role="status"><Icon name="exclamation-triangle" /> {scanText('qualityHint')}</p> : null}
        {quick.rejected.length ? <div className="cn-convertstudio-rejected" role="alert">{quick.rejected.map((file, index) => <p key={index}><strong>{file.name}</strong>: {file.reason}</p>)}<Button variant="link" onClick={quick.dismissRejected}>{s('dismiss')}</Button></div> : null}
      </section>
      <section className="cn-idstudio-panel cn-imagespdf-preview" aria-labelledby={`${ids}-preview`} aria-busy={busy || Boolean(autoItem)}>
        <h2 id={`${ids}-preview`}>2. {s('previewTitle')}</h2>
        {autoItem ? <p role="status"><Spinner as="span" size="sm" className="me-2" />{scanText('autoProcessing')}</p> : null}
        {busy ? <FlowProgress progress={run.state.phase === 'running' ? run.state.progress : null} onCancel={run.cancel} /> : null}
        {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error">{run.state.error.message}</p> : null}
        {count > 0 && !locked && !result ? <div className="cn-imagespdf-retry"><Button variant="outline-primary" onClick={() => void run.start(task())}>{common('result.restart')}</Button>{run.state.phase === 'idle' && run.state.error && !imageFallback ? <Button variant="link" onClick={() => setImageFallback(true)}>{scanText('ocrFallback')}</Button> : null}</div> : null}
        <div className="cn-idstudio-downloads cn-imagespdf-result-actions"><Button variant="primary" disabled={!result || locked} onClick={save}><Icon name="download" />{s('download')}</Button>{result?.text !== undefined ? <Button variant="outline-primary" className="cn-imagespdf-edit-text" disabled={locked} onClick={() => setTextEditor(true)}><Icon name="pencil-square" />{scanText('editText')}</Button> : null}{result ? <SaveToHostButton output={result.output} /> : null}</div>
        <div className="cn-imagespdf-preview-stage" role="region" aria-label={s('previewTitle')}>
          {result ? <TextPdfPreview blob={result.output.blob} name={result.output.name} allPages onEdit={result.text !== undefined && !locked ? () => setTextEditor(true) : undefined} /> : count ? <div className="cn-document-pages">{scanItems.map((item, index) => <DocumentPagePreview key={item.source.id} source={item.source} index={0} sheet={sheet} label={s('page', { page: index + 1, count })} />)}</div> : <div className="cn-imagespdf-empty"><span aria-hidden="true"><Icon name="file-earmark-pdf" /><Icon name="image" /></span><strong>{s('empty')}</strong></div>}
        </div>
        {result ? <p className="cn-imagespdf-result-meta" role="status"><Icon name="check-circle-fill" />{result.output.detail} · {formatFileSize(result.output.blob.size)}</p> : null}
      </section>
    </div>
    {camera ? <CameraCapture show onClose={() => setCamera(false)} onDone={files => { setCamera(false); addFiles(files) }} /> : null}
    {textEditor && result && baseResult ? <OcrTextEditor result={result} sheet={sheet} onBusy={setTextSaving} onClose={() => setTextEditor(false)} onApply={value => { setEdited({ base: baseResult, value }); setTextEditor(false) }} /> : null}
  </ImageStudio>
}
