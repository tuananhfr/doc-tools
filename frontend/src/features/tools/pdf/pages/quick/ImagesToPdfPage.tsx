import { useEffect, useId, useMemo, useState } from 'react'
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
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { handOffFiles } from '../../services/handoff'
import { imagesToPdfTask } from '../../services/quick-tasks'
import type { ImageSheet, Paper } from '../../types/doc-tools.types'
import { DEFAULT_SHEET, SHEET_MARGINS } from '../../utils/image-sheet'

const ACCEPT: readonly QuickKind[] = ['image']
const PAPERS: Paper[] = ['a4', 'a3', 'letter', 'fit']
const RELATED = ['scan-to-pdf', 'merge-pdf', 'split-pdf', 'compress-pdf', 'edit-pdf', 'organize-pdf', 'convert-file', 'pdf-to-image', 'ocr']
const NAVIGATION = ['scan-to-pdf', 'image-to-text', 'ocr', 'convert-image']

/** Images to PDF in the shared scan/conversion layout; preview and export share the sheet renderer. */
export default function ImagesToPdfPage() {
  const { t } = useTranslation('pdf')
  const { t: s } = useTranslation('pdf', { keyPrefix: 'imagesPdfStudio' })
  const { t: common } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const run = useFlowRun()
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
  const count = quick.items.length
  const selected = Math.max(0, quick.items.findIndex(item => item.source.id === activeId))
  const item = quick.items[selected]
  const source = item?.source
  const page = useMemo(() => item ? { ...item.pages[0], sheet } : null, [item, sheet])
  const busy = run.state.phase === 'running'
  const locked = busy || quick.loading !== null || sampleBusy
  const result = run.state.phase === 'done' ? run.state.result : null
  const key = JSON.stringify([quick.items.map(item => item.source.id), sheet])
  useEffect(() => { run.reset() }, [key, run.reset])
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
      const response = await fetch(withBase('/assets/id-photo/portrait-demo-v2.png'))
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      await quick.addFiles([new File([await response.blob()], 'portrait-demo.png', { type: 'image/png' })])
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
    <ToolLeaveGuard active={busy} />
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
        <div className="cn-imagespdf-info"><Icon name="arrow-repeat" /><div><strong>{s('orientation')}</strong><p>{s('orientationHint')}</p></div></div>
        <div className="cn-imagespdf-info"><Icon name="file-earmark-image" /><div><strong>{s('onePerPage')}</strong><p>{s('keepRatio')}</p></div></div>
        <p className="cn-imagespdf-summary"><Icon name="images" />{s('summary', { count })}</p>
        <Button variant="primary" className="cn-imagespdf-run" disabled={locked || !count} onClick={() => void run.start(imagesToPdfTask(quick.items, sheet))}><Icon name="file-earmark-pdf" />{count > 1 ? t('shared.createPdfPages', { count }) : t('shared.createPdf')}</Button>
        {busy ? <FlowProgress progress={run.state.phase === 'running' ? run.state.progress : null} onCancel={run.cancel} /> : null}
        {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error">{run.state.error.message}</p> : null}
      </section>
      <section className="cn-idstudio-panel cn-imagespdf-preview" aria-labelledby={`${ids}-preview`}>
        <h2 id={`${ids}-preview`}>3. {s('previewTitle')}</h2>
        <div className="cn-idstudio-tabs cn-idstudio-preview-tabs"><button type="button" aria-pressed={!original} onClick={() => setOriginal(false)}>{s('layout')}</button><button type="button" aria-pressed={original} onClick={() => setOriginal(true)}>{common('original')}</button></div>
        <div className="cn-imagespdf-preview-stage" role="region" aria-label={original ? common('originalPhoto') : s('layout')}>
          {item && page ? original && originalUrl ? <img src={originalUrl} alt={common('originalPhoto')} /> : <PageCanvas source={item.source} page={page} /> : <div className="cn-imagespdf-empty"><span aria-hidden="true"><Icon name="file-earmark-pdf" /><Icon name="image" /></span><strong>{s('empty')}</strong><p>{s('emptyHint')}</p></div>}
        </div>
        {count ? <><div className="cn-imagespdf-pagination"><Button variant="link" aria-label={s('previous')} disabled={selected === 0} onClick={() => setActiveId(quick.items[selected - 1].source.id)}><Icon name="chevron-left" /></Button><span>{s('page', { page: selected + 1, count })}</span><Button variant="link" aria-label={s('next')} disabled={selected >= count - 1} onClick={() => setActiveId(quick.items[selected + 1].source.id)}><Icon name="chevron-right" /></Button></div><p className="cn-imagespdf-selected-name" title={item.source.name}>{item.source.name}</p></> : null}
        <dl className="cn-idstudio-output-meta"><div><dt>{s('pages')}</dt><dd>{count}</dd></div><div><dt>{t('sheet.paper')}</dt><dd>{sheet.paper === 'fit' ? t('sheet.fit') : sheet.paper === 'letter' ? 'Letter' : sheet.paper.toUpperCase()}</dd></div><div><dt>{s('size')}</dt><dd>{result ? formatFileSize(result.output.blob.size) : '—'}</dd></div></dl>
        {result ? <div className="cn-imagespdf-success" role="status"><Icon name="check-circle-fill" /><strong>{result.title}</strong><small>{result.output.name}</small></div> : null}
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!result || locked} onClick={save}><Icon name="download" />{s('download')}</Button>{result ? <><Button variant="outline-primary" onClick={() => previewOutput(result.output)}><Icon name="box-arrow-up-right" />{s('openPdf')}</Button><Button variant="outline-primary" onClick={editFurther}><Icon name="pencil-square" />{s('editPdf')}</Button><SaveToHostButton output={result.output} /></> : null}</div>
        {!result ? <p className="cn-idstudio-note cn-imagespdf-download-hint">{s('downloadHint')}</p> : null}
        {nudge.extra}
      </section>
    </div>
    {camera ? <CameraCapture show onClose={() => setCamera(false)} onDone={files => { setCamera(false); addFiles(files) }} /> : null}
  </ImageStudio>
}
