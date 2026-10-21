import { useEffect, useId, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, ToolLeaveGuard, useDownloadNudge, useFlowRun } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { withBase } from '@/utils/url'
import { ImageStudio } from '../components/ImageStudio'
import { ImageCameraInput } from '../components/ImageCameraInput'
import { useImageFiles } from '../hooks/useImageFiles'
import { canEncodeWebp } from '../services/image-codec'
import { convertImagesTask } from '../services/image-tasks'
import type { ImageFormat } from '../types/image.types'
import { IMAGE_FORMAT, sizeLabel } from '../utils/image-format'

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
  const nudge = useDownloadNudge()
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [quality, setQuality] = useState<Quality>('high')
  const [webp] = useState(canEncodeWebp)
  const [original, setOriginal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleFailed, setSampleFailed] = useState(false)
  const count = images.items.length
  const item = images.items[0]
  const label = IMAGE_FORMAT[format].label
  const allSame = count > 0 && images.items.every(image => image.format === format)
  const busy = run.state.phase === 'running'
  const locked = busy || images.loading !== null || sampleBusy
  const result = run.state.phase === 'done' ? run.state.result : null
  const key = JSON.stringify([images.items.map(image => image.id), format, quality])
  useEffect(() => { run.reset() }, [key, run.reset])
  useEffect(() => {
    setOriginal(false)
    if (!result?.output.blob.type.startsWith('image/')) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(result.output.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])

  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void images.addFiles(files) } }
  const trySample = async () => {
    if (locked) return
    setSampleBusy(true); setSampleFailed(false)
    try {
      const response = await fetch(withBase('/assets/id-photo/portrait-demo-v2.png'))
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      await images.addFiles([new File([await response.blob()], 'portrait-demo.png', { type: 'image/png' })])
    } catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const save = () => {
    if (!result) return
    downloadOutput(result.output)
    recordQualityEvent('download', 'convert-image')
    nudge.onDownloaded()
  }

  return <ImageStudio toolId="convert-image" icon="arrow-left-right" title={s('title')} subtitle={s('subtitle')} heroNote={s('heroNote')} navigation={NAVIGATION}
    steps={([1, 2, 3, 4, 5] as const).map(index => s(`steps.${index}`))}
    tips={([1, 2, 3, 4] as const).map(index => s(`tips.${index}`))}
    faq={([1, 2, 3, 4] as const).map(index => ({ q: s(`faq.${index}.q`), a: s(`faq.${index}.a`) }))}>
    <ToolLeaveGuard active={busy} />
    <div className="cn-idstudio-editor cn-convertstudio-editor">
      <section className="cn-idstudio-panel cn-convertstudio-upload" aria-labelledby={`${ids}-upload`}>
        <h2 id={`${ids}-upload`}>1. {s('uploadTitle')}</h2>
        <FilePicker accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple title={s('drop')} hint={t('shell.hint')} pickLabel={t('idPhotoStudio.upload')} extra={<ImageCameraInput disabled={locked} onFiles={files => { if (!locked) void images.addFiles(files) }} />} compact={count > 0} loading={images.loading} disabled={locked} onFiles={addFiles} />
        {count ? <FileList files={images.items.map(image => ({ id: image.id, name: image.name, size: image.size, icon: 'file-earmark-image', detail: sizeLabel(image), thumbnail: image.thumbnail ?? undefined }))} disabled={locked} onRemove={images.remove} onClear={images.clear} /> : <div className="cn-convertstudio-sample"><span>{s('or')}</span><Button variant="outline-primary" disabled={locked} onClick={() => void trySample()}>{sampleBusy ? <Spinner as="span" size="sm" /> : <Icon name="image" />}{s('sample')}</Button></div>}
        {sampleFailed ? <p role="alert" className="erp-tool-form__error">{common('sampleFailed')}</p> : null}
        {images.rejected.length ? <div className="cn-convertstudio-rejected" role="alert">{images.rejected.map((file, index) => <p key={index}><strong>{file.name}</strong>: {file.reason}</p>)}<Button variant="link" onClick={images.dismissRejected}>{s('dismiss')}</Button></div> : null}
        <p className="cn-idstudio-local"><Icon name="shield-check" />{s('local')}</p>
      </section>
      <section className="cn-idstudio-panel cn-convertstudio-settings" aria-labelledby={`${ids}-settings`}>
        <h2 id={`${ids}-settings`}>2. {s('settingsTitle')}</h2>
        <fieldset disabled={locked}>
          <legend>{t('convert.targetLegend')}</legend>
          <div className="cn-convertstudio-formats">{TARGETS.filter(value => webp || value !== 'webp').map(value => <button type="button" key={value} aria-pressed={format === value} onClick={() => setFormat(value)} className={`cn-convertstudio-format cn-convertstudio-format--${value}`}><span aria-hidden="true"><Icon name="file-earmark-image-fill" /><b>{IMAGE_FORMAT[value].label}</b></span><strong>{IMAGE_FORMAT[value].label}</strong>{format === value ? <Icon name="check-circle-fill" /> : null}</button>)}</div>
          {format !== 'png' ? <><label htmlFor={`${ids}-quality`}>{t('convert.qualityLegend')}</label><select id={`${ids}-quality`} className="form-select" value={quality} onChange={event => setQuality(event.target.value as Quality)}>{(Object.keys(QUALITY_VALUE) as Quality[]).map(value => <option key={value} value={value}>{t(`convert.quality.${value}.label`)}</option>)}</select><p className="cn-idstudio-note">{t(`convert.quality.${quality}.hint`)}</p></> : <p className="cn-idstudio-note">{s('pngHint')}</p>}
          <div className="cn-convertstudio-preserves"><Icon name="aspect-ratio" /><div><strong>{s('keepSize')}</strong><span>{item ? sizeLabel(item) : s('keepSizeHint')}</span></div><Icon name="check-circle-fill" /></div>
          <p className="cn-convertstudio-format-note"><Icon name="info-circle" />{s(format === 'jpeg' ? 'jpegHint' : format === 'png' ? 'pngDetail' : 'webpHint')}</p>
          {!webp ? <p className="cn-idstudio-note">{t('convert.noWebp')}</p> : null}
        </fieldset>
        <Button variant="primary" className="cn-convertstudio-run" disabled={locked || !count || allSame} onClick={() => void run.start(convertImagesTask(images.items, { format, quality: QUALITY_VALUE[quality] }))}><Icon name="arrow-left-right" />{count > 1 ? t('convert.runMany', { count, format: label }) : t('convert.runOne', { format: label })}</Button>
        {allSame ? <p className="cn-idstudio-note" role="status">{t(count > 1 ? 'convert.blockedMany' : 'convert.blockedOne', { format: label })}</p> : null}
        {busy ? <div className="cn-convertstudio-progress" role="status"><Spinner as="span" size="sm" /><span>{s('converting')}{run.state.phase === 'running' && run.state.progress ? ` ${run.state.progress.done}/${run.state.progress.total}` : ''}</span><Button variant="link" onClick={run.cancel}>{common('cancel')}</Button></div> : null}
        {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error">{run.state.error.message}</p> : null}
      </section>
      <section className="cn-idstudio-panel cn-convertstudio-preview" aria-labelledby={`${ids}-preview`}>
        <h2 id={`${ids}-preview`}>3. {s('previewTitle')}</h2>
        <div className="cn-idstudio-tabs cn-idstudio-preview-tabs"><button type="button" disabled={!result} aria-pressed={!!result && !original} onClick={() => setOriginal(false)}>{s('result')}</button><button type="button" disabled={!item} aria-pressed={!!item && (!result || original)} onClick={() => setOriginal(true)}>{common('original')}</button></div>
        <div className="cn-convertstudio-preview-image">
          {item && (!result || original || previewUrl) ? <img src={result && !original && previewUrl ? previewUrl : item.url} alt={result && !original ? s('resultAlt') : common('originalPhoto')} /> : <div className={`cn-convertstudio-placeholder${result ? ' is-done' : ''}`}><Icon name={result ? 'file-earmark-zip' : 'images'} /><strong>{result ? s('zipReady', { count }) : s('emptyPreview')}</strong><p>{result ? s('zipHint') : s('emptyHint')}</p></div>}
        </div>
        {count > 1 && (!result || original) ? <p className="cn-idstudio-note">{s('firstPreview')}</p> : null}
        <dl className="cn-idstudio-output-meta"><div><dt>{s('selected')}</dt><dd>{s('imageCount', { count })}</dd></div><div><dt>{s('output')}</dt><dd>{label}{count > 1 ? ' · ZIP' : ''}</dd></div><div><dt>{s('size')}</dt><dd>{result ? formatFileSize(result.output.blob.size) : '—'}</dd></div></dl>
        {result ? <div className="cn-convertstudio-success" role="status"><Icon name="check-circle-fill" /><strong>{result.title}</strong><small>{result.output.name}</small></div> : null}
        <div className="cn-idstudio-downloads"><Button variant="primary" disabled={!result || locked} onClick={save}><Icon name="download" />{s(count > 1 ? 'downloadZip' : 'download')}</Button></div>
        {!result ? <p className="cn-idstudio-note">{s('downloadHint')}</p> : <ul className="cn-convertstudio-notes">{result.notes.map(note => <li key={note.text}>{note.text}</li>)}</ul>}
        {nudge.extra}
      </section>
    </div>
  </ImageStudio>
}
