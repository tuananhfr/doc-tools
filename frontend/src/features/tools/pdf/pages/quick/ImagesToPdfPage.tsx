import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { SaveToHostButton } from '@/features/embed'
import { downloadOutput, FilePicker, ToolLeaveGuard, toolPathOf, useDownloadNudge, useFlowRun, useToolsBranch } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { FlowProgress } from '@/features/tools/hub/components/flow/FlowProgress'
import { useToolOrigin } from '@/features/tools/hub/hooks/useToolOrigin'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { previewOutput } from '@/features/tools/hub/utils/flow-output'
import { CameraCapture } from '@/features/tools/image'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { formatFileSize } from '@/utils/format'
import { withBase } from '@/utils/url'
import { PageCanvas } from '../../components/quick/PageCanvas'
import { DocumentScanModal } from '../../components/quick/DocumentScanModal'
import { TextPdfPreview } from '../../components/quick/TextPdfPreview'
import { OcrReview } from '../../components/quick/OcrReview'
import { OcrReadiness } from '../../components/quick/OcrReadiness'
import { useOcrReview } from '../../hooks/useOcrReview'
import { DEFAULT_OCR_OPTIONS } from '../../types/ocr-profile.types'
import { useQuickSources, type QuickItem, type QuickKind } from '../../hooks/useQuickSources'
import type { ScanOptions } from '../../utils/document-scan'
import { handOffFiles } from '../../services/handoff'
import { imagesToPdfTask } from '../../services/quick-tasks'
import type { ImageSheet, Paper } from '../../types/doc-tools.types'
import { DEFAULT_SHEET, SHEET_MARGINS } from '../../utils/image-sheet'
import type { FlowResult } from '@/features/tools/hub'
import { OcrTextEditor } from '../../components/quick/OcrTextEditor'

const ACCEPT: readonly QuickKind[] = ['image']
const PAPERS: Paper[] = ['a4', 'a3', 'letter', 'fit']
const RELATED = ['scan-to-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'edit-pdf', 'organize-pdf', 'convert-file', 'pdf-to-image', 'ocr']
const NAVIGATION = ['scan-to-pdf', 'image-to-text', 'ocr', 'convert-image']

/** Images to PDF in the shared scan/conversion layout; preview and export share the sheet renderer. */
export default function ImagesToPdfPage() {
  // Load review translations before recognition starts; suspending the running tool can abort its task.
  useTranslation('ocr')
  const { t } = useTranslation('pdf')
  const { t: s } = useTranslation('pdf', { keyPrefix: 'imagesPdfStudio' })
  const { t: common } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const { t: scanText } = useTranslation('pdf', { keyPrefix: 'documentScan' })
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const run = useFlowRun()
  const review = useOcrReview()
  const reviewHost = useRef<HTMLDivElement>(null)
  const [searchable, setSearchable] = useState(true)
  const [ocrLayout, setOcrLayout] = useState<'text' | 'image'>('text')
  const [checkOcr, setCheckOcr] = useState(false)
  const [textEditor, setTextEditor] = useState(false), [textSaving, setTextSaving] = useState(false)
  const [edited, setEdited] = useState<{ base: FlowResult; value: FlowResult } | null>(null)
  const nudge = useDownloadNudge()
  const navigate = useNavigate()
  const { base } = useToolsBranch()
  const { capture } = useToolOrigin()
  const ids = useId()
  const [sheet, setSheet] = useState<ImageSheet>(DEFAULT_SHEET)
  const [camera, setCamera] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [original, setOriginal] = useState(false)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scans, setScans] = useState<Record<string, { item: QuickItem; options: ScanOptions }>>({})
  const scanItems = useMemo(() => quick.items.map(item => scans[item.source.id]?.item ?? item), [quick.items, scans])
  const count = quick.items.length
  const selected = Math.max(0, quick.items.findIndex(item => item.source.id === activeId))
  const item = quick.items[selected]
  const source = item?.source
  const previewItem = scanItems[selected]
  const page = useMemo(() => previewItem ? { ...previewItem.pages[0], sheet } : null, [previewItem, sheet])
  const busy = run.state.phase === 'running'
  const locked = busy || quick.loading !== null || sampleBusy || textSaving
  const baseResult = run.state.phase === 'done' ? run.state.result : null
  const result = baseResult && edited?.base === baseResult ? edited.value : baseResult
  const textOutput = searchable && ocrLayout === 'text'
  const key = JSON.stringify([scanItems.map(item => item.source.id), sheet, searchable, ocrLayout])
  useEffect(() => { run.reset(); setEdited(null); setTextEditor(false) }, [key, run.reset])
  useEffect(() => { if (review.pages) reviewHost.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [review.pages])
  useEffect(() => {
    const ids = new Set(quick.items.map(item => item.source.id))
    setScans(current => Object.keys(current).every(id => ids.has(id)) ? current : Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))))
  }, [quick.items])
  useEffect(() => {
    if (!source || source.kind !== 'image') { setOriginalUrl(null); return }
    const url = URL.createObjectURL(new Blob([source.bytes], { type: source.mime }))
    setOriginalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source])
  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void quick.addFiles(files) } }
  const trySample = async () => {
    if (locked) return
    setSampleBusy(true); setSampleFailed(false)
    try {
      const response = await fetch(withBase('/assets/document-scan/demo.png'))
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      await quick.addFiles([new File([await response.blob()], 'document-demo.png', { type: 'image/png' })])
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const save = () => {
    if (!result || locked) return
    downloadOutput(result.output); recordQualityEvent('download', 'scan-to-pdf'); nudge.onDownloaded()
  }
  const editFurther = () => {
    if (!result) return
    handOffFiles([new File([result.output.blob], result.output.name, { type: 'application/pdf' })])
    navigate(toolPathOf(base, 'edit-pdf'), { state: capture() })
  }

  return <ImageStudio toolId="scan-to-pdf" icon="file-earmark-pdf-fill" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')} navigation={NAVIGATION}
    category={{ title: s('category'), icon: 'file-earmark-pdf', path: '/tai-lieu-pdf', tools: RELATED, relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={busy || count > 0} />
    <div className="cn-idstudio-editor cn-imagespdf-editor">
      <section className="cn-idstudio-panel cn-convertstudio-upload cn-imagespdf-upload" aria-labelledby={`${ids}-upload`}>
        <h2 id={`${ids}-upload`}>1. {s('uploadTitle')}</h2>
        <FilePicker accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple title={s('drop')} hint={t('picker.image')} compact={count > 0} loading={quick.loading} disabled={locked} onFiles={addFiles} />
        <div className="cn-imagespdf-upload-actions"><Button variant="outline-primary" disabled={locked} onClick={() => setCamera(true)}><Icon name="camera" />{t('imagesToPdf.camera')}</Button>{!count ? <Button variant="outline-primary" disabled={locked} onClick={() => void trySample()}>{sampleBusy ? <Spinner as="span" size="sm" /> : <Icon name="image" />}{s('sample')}</Button> : null}</div>
        {count ? <><p className="cn-idstudio-note">{s('orderHint')}</p><FileList files={quick.items.map(({ source }) => ({ id: source.id, name: source.name, size: source.size, icon: 'file-earmark-image', thumbnail: quick.thumbnails[source.id] }))} disabled={locked} onRemove={quick.remove} onMove={quick.move} onClear={quick.clear} /></> : null}
        {sampleFailed ? <p role="alert" className="erp-tool-form__error">{common('sampleFailed')}</p> : null}
        {quick.rejected.length ? <div className="cn-convertstudio-rejected" role="alert">{quick.rejected.map((file, index) => <p key={index}><strong>{file.name}</strong>: {file.reason}</p>)}<Button variant="link" onClick={quick.dismissRejected}>{s('dismiss')}</Button></div> : null}
        <p className="cn-idstudio-local"><Icon name="shield-check" />{s('local')}</p>
      </section>
      <section className="cn-idstudio-panel cn-imagespdf-settings" aria-labelledby={`${ids}-settings`}>
        <h2 id={`${ids}-settings`}>2. {s('settingsTitle')}</h2>
        <fieldset disabled={locked}><legend>{t('sheet.paper')}</legend><div className="cn-imagespdf-papers">{PAPERS.map(paper => <button key={paper} type="button" aria-pressed={sheet.paper === paper} onClick={() => setSheet(current => ({ ...current, paper }))}><span className={`cn-imagespdf-paper cn-imagespdf-paper--${paper}`} aria-hidden="true"><Icon name="image" /></span><strong>{paper === 'fit' ? t('sheet.fit') : paper === 'letter' ? 'Letter' : paper.toUpperCase()}</strong>{sheet.paper === paper ? <Icon name="check-circle-fill" /> : null}</button>)}</div></fieldset>
        <fieldset disabled={locked}><legend>{t('sheet.margin')}</legend><div className="cn-imagespdf-margins">{SHEET_MARGINS.map(margin => <button key={margin} type="button" aria-pressed={sheet.margin === margin} onClick={() => setSheet(current => ({ ...current, margin }))}>{margin ? `${margin} mm` : t('sheet.noMargin')}</button>)}</div></fieldset>
        <p className="cn-imagespdf-summary"><Icon name="images" />{s('summary', { count })}</p>
        <div className="cn-imagespdf-ocr">
          <label><input type="checkbox" checked={searchable} disabled={locked || scanOpen} onChange={event => setSearchable(event.target.checked)} /> {scanText('ocrEnable')}</label>
          {searchable ? <label className="cn-imagespdf-ocr-layout">{scanText('ocrLayout')}<select value={ocrLayout} disabled={locked || scanOpen} onChange={event => { setOcrLayout(event.target.value as 'text' | 'image'); setOriginal(false) }}><option value="text">{scanText('textLayout')}</option><option value="image">{scanText('imageLayout')}</option></select></label> : null}
          {searchable ? <label><input type="checkbox" checked={checkOcr} disabled={locked || scanOpen} onChange={event => setCheckOcr(event.target.checked)} /> {scanText('ocrOptionalReview')}</label> : null}
          {searchable ? <OcrReadiness compact /> : null}
        </div>
        <Button variant="primary" className="cn-imagespdf-run" disabled={locked || !count || scanOpen} onClick={() => void run.start(imagesToPdfTask(scanItems, sheet, searchable ? { review: checkOcr ? review.request : undefined, options: DEFAULT_OCR_OPTIONS, layout: ocrLayout } : undefined))}><Icon name="file-earmark-pdf" />{textOutput ? scanText('textRun') : searchable ? scanText('ocrRun') : count > 1 ? t('shared.createPdfPages', { count }) : t('shared.createPdf')}</Button>
        {textOutput && result?.text !== undefined ? <Button variant="outline-primary" className="cn-imagespdf-edit-text mt-2" disabled={locked} onClick={() => setTextEditor(true)}><Icon name="pencil-square" /> {scanText('editText')}</Button> : null}
        {busy ? <FlowProgress progress={run.state.phase === 'running' ? run.state.progress : null} onCancel={run.cancel} /> : null}
        {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error">{run.state.error.message}</p> : null}
        {searchable && run.state.phase === 'idle' && run.state.error ? <Button variant="outline-secondary" className="cn-imagespdf-ocr-fallback" onClick={() => setSearchable(false)}>{scanText('ocrFallback')}</Button> : null}
      </section>
      <section className="cn-idstudio-panel cn-imagespdf-preview" aria-labelledby={`${ids}-preview`}>
        <h2 id={`${ids}-preview`}>3. {s('previewTitle')}</h2>
        {item ? <div className="cn-imagespdf-scan-controls">
          <label>{scanText('pageLabel')} <select value={selected} disabled={locked} onChange={event => { setActiveId(quick.items[Number(event.target.value)].source.id); setOriginal(false) }}>{quick.items.map((item, index) => <option key={item.source.id} value={index}>{index + 1}. {item.source.name}</option>)}</select></label>
          <Button variant="outline-primary" disabled={locked} onClick={() => setScanOpen(true)}><Icon name="crop" /> {scanText(scans[item.source.id] ? 'edit' : 'start')}</Button>
          {scans[item.source.id] ? <Button variant="link" disabled={locked} onClick={() => setScans(current => { const next = { ...current }; delete next[item.source.id]; return next })}>{scanText('restore')}</Button> : null}
          <small>{scanText('count', { processed: quick.items.filter(item => scans[item.source.id]).length, total: count })}</small>
        </div> : null}
        <div className="cn-idstudio-tabs cn-idstudio-preview-tabs"><button type="button" aria-pressed={!original} onClick={() => setOriginal(false)}>{s('layout')}</button><button type="button" aria-pressed={original} onClick={() => setOriginal(true)}>{common('original')}</button></div>
        <div className="cn-imagespdf-preview-stage" role="region" aria-label={original ? common('originalPhoto') : s('layout')}>
          {textOutput && !original ? result ? <TextPdfPreview blob={result.output.blob} name={result.output.name} onEdit={locked ? undefined : () => setTextEditor(true)} /> : <div className="cn-imagespdf-empty"><Icon name="file-earmark-text" /><p>{scanText('textPreviewHint')}</p></div> : previewItem && page ? original && originalUrl ? <img src={originalUrl} alt={common('originalPhoto')} /> : <PageCanvas source={previewItem.source} page={page} /> : <div className="cn-imagespdf-empty"><span aria-hidden="true"><Icon name="file-earmark-pdf" /><Icon name="image" /></span><strong>{s('empty')}</strong><p>{s('emptyHint')}</p></div>}
        </div>
        {count && (!textOutput || original) ? <><div className="cn-imagespdf-pagination"><Button variant="link" aria-label={s('previous')} disabled={selected === 0} onClick={() => setActiveId(quick.items[selected - 1].source.id)}><Icon name="chevron-left" /></Button><span>{s('page', { page: selected + 1, count })}</span><Button variant="link" aria-label={s('next')} disabled={selected >= count - 1} onClick={() => setActiveId(quick.items[selected + 1].source.id)}><Icon name="chevron-right" /></Button></div><p className="cn-imagespdf-selected-name" title={item.source.name}>{item.source.name}</p></> : null}
        <dl className="cn-idstudio-output-meta"><div><dt>{textOutput ? scanText('inputPages') : s('pages')}</dt><dd>{count}</dd></div><div><dt>{t('sheet.paper')}</dt><dd>{sheet.paper === 'fit' ? t('sheet.fit') : sheet.paper === 'letter' ? 'Letter' : sheet.paper.toUpperCase()}</dd></div><div><dt>{s('size')}</dt><dd>{result ? formatFileSize(result.output.blob.size) : '—'}</dd></div></dl>
        {result ? <div className="cn-imagespdf-success" role="status"><Icon name="check-circle-fill" /><strong>{result.title}</strong><small>{result.output.name}</small><small>{scanText(textOutput ? 'textHint' : searchable ? 'ocrResult' : 'imagePdfHint')}</small>{result.notes.map((note, index) => <small key={index}>{note.text}</small>)}</div> : null}
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!result || locked} onClick={save}><Icon name="download" />{s('download')}</Button>{result ? <><Button variant="outline-primary" onClick={() => previewOutput(result.output)}><Icon name="box-arrow-up-right" />{s('openPdf')}</Button><Button variant="outline-primary" onClick={editFurther}><Icon name="pencil-square" />{s('editPdf')}</Button><SaveToHostButton output={result.output} /></> : null}</div>
        {!result ? <p className="cn-idstudio-note cn-imagespdf-download-hint">{s('downloadHint')}</p> : null}
        {nudge.extra}
      </section>
    </div>
    {review.pages ? <div ref={reviewHost} className="cn-imagespdf-ocr-review"><Button variant="outline-secondary" onClick={run.cancel}>{scanText('ocrCancel')}</Button><OcrReview pages={review.pages} onComplete={review.complete} /></div> : null}
    {camera ? <CameraCapture show onClose={() => setCamera(false)} onDone={files => { setCamera(false); addFiles(files) }} /> : null}
    {scanOpen && item ? <DocumentScanModal key={item.source.id} item={item} initial={scans[item.source.id]?.options} onClose={() => setScanOpen(false)} onApply={(processed, options) => { setScans(current => ({ ...current, [item.source.id]: { item: processed, options } })); setOriginal(false); setScanOpen(false) }} /> : null}
    {textEditor && result && baseResult ? <OcrTextEditor result={result} sheet={sheet} onBusy={setTextSaving} onClose={() => setTextEditor(false)} onApply={value => { setEdited({ base: baseResult, value }); setOriginal(false); setTextEditor(false) }} /> : null}
  </ImageStudio>
}
