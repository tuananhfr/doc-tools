import { useEffect, useId, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, FlowChoice, ToolLeaveGuard, useFlowRun } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { useAutomaticFlow } from '@/features/tools/hub/hooks/useAutomaticFlow'
import { ImageStudio } from '../components/ImageStudio'
import { ImageCameraInput } from '../components/ImageCameraInput'
import { useImageFiles } from '../hooks/useImageFiles'
import { canEncodeWebp } from '../services/image-codec'
import { convertImagesTask } from '../services/image-tasks'
import type { ImageFormat } from '../types/image.types'
import { IMAGE_FORMAT } from '../utils/image-format'

const TARGETS: ImageFormat[] = ['jpeg', 'png', 'webp']
const NAVIGATION = ['convert-image', 'compress-image', 'crop-image', 'remove-background']
const QUALITY_VALUE = { high: 0.92, medium: 0.8, small: 0.6 }
type Quality = keyof typeof QUALITY_VALUE

/** Batch image conversion in the approved scan/conversion processing layout. */
export default function ConvertImagePage() {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'convertStudio' })
  const { t: common } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const ids = useId()
  const images = useImageFiles({ multiple: true, revealTarget: '.cn-convertstudio-preview' })
  const run = useFlowRun()
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState<Quality>('high')
  const [webp] = useState(canEncodeWebp)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const count = images.items.length
  const item = images.items[0]
  const label = IMAGE_FORMAT[format].label
  const busy = run.state.phase === 'running'
  const result = run.state.phase === 'done' ? run.state.result : null
  const key = JSON.stringify([images.items.map(image => image.id), format, quality])
  const task = () => convertImagesTask(images.items, { format, quality: QUALITY_VALUE[quality] })
  const pending = useAutomaticFlow(run, key, count > 0 && images.loading === null, task)
  const locked = busy || pending || images.loading !== null
  useEffect(() => {
    if (!result?.output.blob.type.startsWith('image/')) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(result.output.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])

  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void images.addFiles(files) } }
  const save = () => {
    if (!result) return
    downloadOutput(result.output)
    recordQualityEvent('download', 'convert-image')
  }

  return <ImageStudio automatic toolId="convert-image" icon="arrow-left-right" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')} navigation={NAVIGATION}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={busy} />
    <div className="cn-idstudio-editor cn-convertstudio-editor">
      <section className="cn-idstudio-panel cn-convertstudio-upload" aria-labelledby={`${ids}-upload`}>
        <h2 id={`${ids}-upload`}>1. {s('uploadTitle')}</h2>
        <FilePicker accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple title={s('drop')} hint={t('shell.hint')} pickLabel={t('idPhotoStudio.upload')} extra={<ImageCameraInput disabled={locked} onFiles={files => { if (!locked) void images.addFiles(files) }} />} compact={count > 0} loading={images.loading} disabled={locked} onFiles={addFiles} />
        {count ? <FileList compact files={images.items.map(image => ({ id: image.id, name: image.name, size: image.size, icon: 'file-earmark-image' }))} disabled={locked} onRemove={images.remove} onClear={images.clear} /> : null}
        {images.rejected.length ? <div className="cn-convertstudio-rejected" role="alert">{images.rejected.map((file, index) => <p key={index}><strong>{file.name}</strong>: {file.reason}</p>)}<Button variant="link" onClick={images.dismissRejected}>{s('dismiss')}</Button></div> : null}
      </section>
      <section className="cn-idstudio-panel cn-convertstudio-settings" aria-labelledby={`${ids}-settings`}>
        <h2 id={`${ids}-settings`}>{s('settingsTitle')}</h2>
        <fieldset disabled={locked}>
          <legend>{t('convert.targetLegend')}</legend>
          <div className="cn-convertstudio-formats">{TARGETS.filter(value => webp || value !== 'webp').map(value => <button type="button" key={value} aria-pressed={format === value} onClick={() => setFormat(value)} className={`cn-convertstudio-format cn-convertstudio-format--${value}`}><strong>{IMAGE_FORMAT[value].label}</strong>{format === value ? <Icon name="check-circle-fill" /> : null}</button>)}</div>
          {format !== 'png' ? <FlowChoice inline legend={t('convert.qualityLegend')} value={quality} onChange={setQuality} options={(Object.keys(QUALITY_VALUE) as Quality[]).map(value => ({ value, label: t(`convert.quality.${value}.label`) }))} /> : null}
          {!webp ? <p className="cn-idstudio-note" role="status">{t('convert.noWebp')}</p> : null}
        </fieldset>
        {!locked && count > 0 && !result ? <Button variant="outline-primary" className="cn-convertstudio-run" onClick={() => void run.start(task())}>{t('camera.retry')}</Button> : null}
        {busy ? <div className="cn-convertstudio-progress" role="status"><Spinner as="span" size="sm" /><span>{s('converting')}{run.state.phase === 'running' && run.state.progress ? ` ${run.state.progress.done}/${run.state.progress.total}` : ''}</span><Button variant="link" onClick={run.cancel}>{common('cancel')}</Button></div> : null}
        {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error">{run.state.error.message}</p> : null}
      </section>
      <section className="cn-idstudio-panel cn-convertstudio-preview" aria-labelledby={`${ids}-preview`}>
        <h2 id={`${ids}-preview`}>2. {s('previewTitle')}</h2>
        <div className="cn-convertstudio-preview-image">
          {item && (!result || previewUrl) ? <img src={result && previewUrl ? previewUrl : item.url} alt={result ? s('resultAlt') : common('originalPhoto')} /> : <div className={`cn-convertstudio-placeholder${result ? ' is-done' : ''}`}><Icon name={result ? 'file-earmark-zip' : 'images'} /><strong>{result ? s('zipReady', { count }) : s('emptyPreview')}</strong><p>{result ? s('zipHint') : s('emptyHint')}</p></div>}
        </div>
        {result ? <div className="cn-convertstudio-success" role="status"><Icon name="check-circle-fill" /><span>{label}{count > 1 ? ` · ${s('imageCount', { count })} · ZIP` : ''} · {formatFileSize(result.output.blob.size)}</span></div> : null}
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!result || locked} onClick={save}><Icon name="download" />{s(count > 1 ? 'downloadZip' : 'download')}</Button></div>
        {result?.notes.some(note => note.tone === 'warning') ? <ul className="cn-convertstudio-notes">{result.notes.filter(note => note.tone === 'warning').map(note => <li key={note.text}>{note.text}</li>)}</ul> : null}
      </section>
    </div>
  </ImageStudio>
}
