import { useEffect, useId, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, ToolLeaveGuard, useDownloadNudge, useFlowRun } from '@/features/tools/hub'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { withBase } from '@/utils/url'
import { CameraCapture } from '../components/CameraCapture'
import { CropOptions } from '../components/CropOptions'
import { CropStage } from '../components/CropStage'
import { ImageStudio } from '../components/ImageStudio'
import { ImageStudioUpload } from '../components/ImageStudioUpload'
import { HandoffButton } from '../components/HandoffButton'
import { outputFile } from '../utils/handoff-file'
import { useCropEdit } from '../hooks/useCropEdit'
import { useCropPreview } from '../hooks/useCropPreview'
import { useImageFiles } from '../hooks/useImageFiles'
import { cropTask } from '../services/edit-tasks'
import { writableFormat } from '../services/image-codec'
import { initialCrop, isPristine } from '../utils/crop-state'
import { rotatedSize, snapRect } from '../utils/crop-rect'
import { IMAGE_FORMAT, sizeLabel } from '../utils/image-format'

const SAMPLE = '/assets/id-photo/portrait-demo-v2.png'
const TABS = ['crop', 'rotate', 'light', 'advanced'] as const
const EMPTY_SIZE = { width: 1200, height: 900 }

/** Cắt, xoay, lật và chỉnh sáng trong khung giao diện chung của các công cụ ảnh. */
export default function CropImagePage() {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'cropStudio' })
  const { t: common } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const ids = useId()
  const images = useImageFiles({ multiple: false, revealTarget: '.cn-cropstudio-stage' })
  const run = useFlowRun()
  const nudge = useDownloadNudge()
  const item = images.items[0] ?? null
  const crop = useCropEdit(item)
  const state = crop.state
  const ready = item !== null && state !== null
  const preview = useCropPreview(item, state)
  const [tab, setTab] = useState<typeof TABS[number]>('crop')
  const [camera, setCamera] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const key = JSON.stringify([item?.id, state])
  const pristine = !ready || isPristine(state, item)
  const dirty = !pristine && savedKey !== key
  const busy = run.state.phase === 'running'
  const locked = busy || !!images.loading || sampleBusy
  const output = ready ? snapRect(state.rect, rotatedSize(item, state.rotation)) : null
  const format = item ? writableFormat(item.format) : null
  const result = run.state.phase === 'done' ? run.state.result : null
  useEffect(() => { run.reset() }, [key, run.reset])

  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void images.addFiles(files) } }
  const trySample = async () => {
    if (locked) return
    setSampleBusy(true); setSampleFailed(false)
    try {
      const response = await fetch(withBase(SAMPLE))
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      const blob = await response.blob()
      await images.addFiles([new File([blob], 'portrait-demo.png', { type: 'image/png' })])
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const save = () => {
    if (!ready || locked || pristine || preview.failed) return
    const task = cropTask(item, state), snapshot = key
    void run.start(async step => {
      const exported = await task(step)
      step.signal.throwIfAborted()
      downloadOutput(exported.output)
      recordQualityEvent('download', 'crop-image')
      setSavedKey(snapshot); nudge.onDownloaded()
      return exported
    })
  }

  return <ImageStudio toolId="crop-image" icon="crop" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')}
    steps={([1, 2, 3, 4, 5] as const).map(step => s(`steps.${step}`))}
    tips={([1, 2, 3, 4, 5] as const).map(tip => s(`tips.${tip}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={dirty} />
    <div className="cn-idstudio-editor cn-cropstudio-editor">
      <ImageStudioUpload images={images} disabled={locked} sampleBusy={sampleBusy} sampleFailed={sampleFailed} sampleUrl={SAMPLE} sampleLabel={s('sampleLabel')} onFiles={addFiles} onCamera={() => setCamera(true)} onSample={() => void trySample()} onClear={() => { run.reset(); images.clear() }} />
      <section className="cn-idstudio-panel cn-cropstudio-edit" aria-labelledby={`${ids}-edit-title`}>
        <h2 id={`${ids}-edit-title`}><span>2.</span> {s('editTitle')}</h2>
        <div className="cn-idstudio-tabs" aria-label={s('editTitle')}>{TABS.map(value => <button type="button" key={value} aria-pressed={tab === value} aria-controls={`${ids}-controls`} onClick={() => setTab(value)}>{s(`tabs.${value}`)}</button>)}</div>
        <fieldset id={`${ids}-controls`} className="cn-idstudio-settings cn-cropstudio-controls" disabled={!ready || locked}>
          <CropOptions item={item ?? EMPTY_SIZE} state={state ?? initialCrop(EMPTY_SIZE)} section={tab} onChange={crop.update} onReset={crop.reset} />
        </fieldset>
        <div className="cn-cropstudio-stage">
          {ready ? <CropStage item={item} state={state} disabled={locked} onRectChange={rect => crop.update(current => ({ ...current, rect }))} />
            : <div className="cn-cropstudio-demo"><div aria-hidden="true"><img src={withBase(SAMPLE)} alt="" /><span className="cn-cropstudio-demo-frame"><span /></span></div><p><Icon name="cursor" />{s('emptyStage')}</p></div>}
        </div>
        <div className="cn-cropstudio-toolbar"><span>{ready ? `${state.rotation}° · ${sizeLabel(output!)}` : s('stageHint')}</span><Button variant="outline-secondary" disabled={!ready || locked || pristine} onClick={crop.reset}><Icon name="arrow-counterclockwise" />{s('reset')}</Button></div>
        <p className="cn-idstudio-note">{s(tab === 'crop' ? 'cropHint' : tab === 'rotate' ? 'rotateHint' : tab === 'light' ? 'lightHint' : 'keyboardHint')}</p>
      </section>
      <section className="cn-idstudio-panel cn-cropstudio-preview" aria-labelledby={`${ids}-preview-title`}>
        <h2 id={`${ids}-preview-title`}><span>3.</span> {s('previewTitle')}</h2>
        <div className="cn-cropstudio-result-image">
          <img src={item ? preview.url ?? item.url : withBase(SAMPLE)} alt={item ? s('previewAlt') : common('samplePreview')} />
          {preview.busy ? <span role="status"><Spinner as="span" size="sm" />{common('updating')}</span> : null}
        </div>
        {!ready ? <p className="cn-idstudio-demo-note">{common('demoNote')}</p> : null}
        <dl className="cn-idstudio-output-meta"><div><dt>{s('sourceSize')}</dt><dd>{item ? sizeLabel(item) : '—'}</dd></div><div><dt>{s('outputSize')}</dt><dd>{output ? sizeLabel(output) : '—'}</dd></div><div><dt>{s('format')}</dt><dd>{format ? IMAGE_FORMAT[format].label : 'JPG / PNG / WebP'}</dd></div></dl>
        <div className="cn-cropstudio-preserves"><Icon name="check-circle-fill" /><span>{s('preserves')}</span></div>
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!ready || locked || pristine || preview.failed} onClick={save}><Icon name="download" />{s('save')}</Button></div>
        {ready && pristine ? <p className="cn-idstudio-note" role="status">{t('crop.blocked')}</p> : null}
        {preview.failed ? <p className="erp-tool-form__error" role="alert">{t('shared.previewFailed')}</p> : null}
        {busy ? <div className="cn-idstudio-run" role="status"><Spinner as="span" size="sm" />{s('saving')}<Button variant="link" onClick={run.cancel}>{common('cancel')}</Button></div> : null}
        {run.state.phase === 'idle' && run.state.error ? <p className="erp-tool-form__error" role="alert">{run.state.error.message}</p> : null}
        {result ? <div className="cn-idstudio-result" role="status"><p><Icon name="check-circle-fill" /><strong>{result.title}</strong></p><small>{result.output.name} · {formatFileSize(result.output.blob.size)}</small><Button variant="link" onClick={() => { downloadOutput(result.output); nudge.onDownloaded() }}>{common('downloadAgain')}</Button><HandoffButton target="id-photo" label={t('handoff.toIdPhoto')} file={() => outputFile(result.output)} />{result.notes.map(note => <p key={note.text}>{note.text}</p>)}</div> : null}
        {nudge.extra}
      </section>
    </div>
    {camera ? <CameraCapture show maxShots={1} onClose={() => setCamera(false)} onDone={files => { setCamera(false); addFiles(files) }} /> : null}
  </ImageStudio>
}
