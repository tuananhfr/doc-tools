import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { downloadOutput, FilePicker, useFlowRun } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { formatFileSize } from '@/utils/format'
import { ImageUtilityStudio } from '../components/ImageUtilityStudio'
import { ImageCameraInput } from '../components/ImageCameraInput'
import { useImageFiles } from '../hooks/useImageFiles'
import { compressImagesTask } from '../services/image-tasks'
import { sizeLabel } from '../utils/image-format'
import { useAutomaticFlow } from '@/features/tools/hub/hooks/useAutomaticFlow'

const LEVEL_QUALITY = { light: .85, medium: .7, strong: .5 }
type Level = keyof typeof LEVEL_QUALITY
const LEVELS: Level[] = ['light', 'medium', 'strong']
const EDGES = [0, 3840, 2560, 1920, 1280]

export default function CompressImagePage() {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'utilityStudio.compress' })
  const { t: shared } = useTranslation('image', { keyPrefix: 'convertStudio' })
  const edgeId = useId()
  const images = useImageFiles({ multiple: true, revealTarget: '.cn-compressstudio-output' }), run = useFlowRun()
  const [level, setLevel] = useState<Level>('medium'), [maxEdge, setMaxEdge] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const count = images.items.length, item = images.items[0]
  const busy = run.state.phase === 'running'
  const result = run.state.phase === 'done' ? run.state.result : null
  const signature = JSON.stringify([images.items.map(image => image.id), level, maxEdge])
  const task = () => compressImagesTask(images.items, { quality: LEVEL_QUALITY[level], maxEdge: maxEdge || null })
  const pending = useAutomaticFlow(run, signature, count > 0 && images.loading === null, task)
  const locked = busy || pending || images.loading !== null
  useEffect(() => {
    if (!result?.output.blob.type.startsWith('image/')) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(result.output.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])
  const save = () => { if (result) { downloadOutput(result.output); recordQualityEvent('download', 'compress-image') } }
  return <ImageUtilityStudio kind="compress"><div className="cn-idstudio-editor cn-compressstudio-editor">
    <section className="cn-idstudio-panel cn-convertstudio-upload"><h2>{s('inputTitle')}</h2>
      <FilePicker accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple title={t('compress.pickerTitle')} hint={t('shell.hint')} pickLabel={t('idPhotoStudio.upload')} extra={<ImageCameraInput disabled={locked} onFiles={files => { if (!locked) void images.addFiles(files) }} />} compact={count > 0} loading={images.loading} disabled={locked} onFiles={files => { if (!locked) void images.addFiles(files) }} />
      {count ? <FileList compact files={images.items.map(image => ({ id: image.id, name: image.name, size: image.size, icon: 'file-earmark-image', detail: sizeLabel(image), thumbnail: image.thumbnail ?? undefined }))} disabled={locked} onRemove={images.remove} onClear={images.clear} /> : null}
      {images.rejected.length ? <div className="cn-compressstudio-rejected" role="alert">{images.rejected.map((entry, index) => <p key={index}><strong>{entry.name}</strong> — {entry.reason}</p>)}<Button variant="link" onClick={images.dismissRejected}>{s('dismiss')}</Button></div> : null}
    </section>
    <section className="cn-idstudio-panel cn-compressstudio-settings"><h2>{s('optionsTitle').replace(/^\d+[.)]\s*/, '')}</h2>
      <fieldset disabled={locked}><legend>{t('compress.levelLegend')}</legend><div className="cn-compressstudio-levels">{LEVELS.map(value => <button key={value} type="button" aria-pressed={level === value} onClick={() => setLevel(value)}>{t(`compress.level.${value}.label`)}</button>)}</div>
        <label htmlFor={edgeId}>{t('shared.maxEdge')}</label><Form.Select id={edgeId} value={maxEdge} onChange={event => setMaxEdge(Number(event.target.value))}>{EDGES.map(edge => <option key={edge} value={edge}>{edge ? `${edge} px` : t('shared.keepSize')}</option>)}</Form.Select>
      </fieldset>
      {!locked && count > 0 && !result ? <Button variant="outline-primary" className="cn-imageutility-run" onClick={() => void run.start(task())}>{t('camera.retry')}</Button> : null}
      {busy ? <div className="cn-imageutility-progress" role="status"><span>{run.state.phase === 'running' && run.state.progress ? `${run.state.progress.done}/${run.state.progress.total}` : s('processing')}</span><Button variant="link" onClick={run.cancel}>{s('cancel')}</Button></div> : null}
      {run.state.phase === 'idle' && run.state.error ? <p className="cn-imageutility-error" role="alert">{run.state.error.message}</p> : null}
    </section>
    <section className="cn-idstudio-panel cn-compressstudio-output"><h2>2. {shared('previewTitle')}</h2>
      <div className="cn-imageutility-preview">{item && (!result || previewUrl) ? <img src={result && previewUrl ? previewUrl : item.url} alt={result ? shared('resultAlt') : s('original')} /> : <div className="cn-imageutility-empty"><Icon name={result ? 'file-earmark-zip' : 'images'} /><strong>{result ? shared('zipReady', { count }) : shared('emptyPreview')}</strong><p>{result ? shared('zipHint') : shared('emptyHint')}</p></div>}</div>
      <dl className="cn-idstudio-output-meta"><div><dt>{shared('selected')}</dt><dd>{shared('imageCount', { count })}</dd></div><div><dt>{s('before')}</dt><dd>{formatFileSize(images.items.reduce((total, image) => total + image.size, 0))}</dd></div>{result ? <div><dt>{s('output')}</dt><dd>{formatFileSize(result.output.blob.size)}{count > 1 ? ' · ZIP' : ''}</dd></div> : null}</dl>
      {result ? <><p className="cn-imageutility-success" role="status"><Icon name="check-circle-fill" />{result.title}</p>{result.notes.some(note => note.tone === 'warning') ? <ul className="cn-imageutility-notes">{result.notes.filter(note => note.tone === 'warning').map((note, index) => <li key={index}>{note.text}</li>)}</ul> : null}</> : null}
      <Button className="cn-imageutility-run" disabled={!result || locked} onClick={save}><Icon name="download" />{shared(count > 1 ? 'downloadZip' : 'download')}</Button>
    </section>
  </div></ImageUtilityStudio>
}
