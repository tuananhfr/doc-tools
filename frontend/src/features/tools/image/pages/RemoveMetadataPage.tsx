import { useEffect, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker, useFlowRun, type FlowTask } from '@/features/tools/hub'
import { FileList } from '@/features/tools/hub/components/flow/FileList'
import { useAutomaticFlow } from '@/features/tools/hub/hooks/useAutomaticFlow'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { ExtendedImageStudio } from '../components/ExtendedImageStudio'
import { ImageCameraInput } from '../components/ImageCameraInput'
import { useImageFiles } from '../hooks/useImageFiles'
import { removeImageMetadata } from '../services/remove-metadata'

export default function RemoveMetadataPage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.metadata' })
  const { t: common } = useTranslation('common')
  const { t: s } = useTranslation('image', { keyPrefix: 'extendedStudio.metadata' })
  const images = useImageFiles({ multiple: false, revealTarget: '.cn-metadatastudio-output' }), item = images.items[0]
  const run = useFlowRun()
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const result = run.state.phase === 'done' ? run.state.result : null
  const task = (): FlowTask => async ({ signal }) => {
    signal.throwIfAborted()
    if (!item) throw new Error(t('removeMeta.idle'))
    const output = await removeImageMetadata(item.file)
    signal.throwIfAborted()
    return { title: s('result'), output: { name: `${item.name.replace(/\.[^.]+$/, '')}-khong-exif.${output.extension}`, blob: output.blob }, notes: [] }
  }
  const pending = useAutomaticFlow(run, item?.id ?? '', Boolean(item) && images.loading === null, task)
  const busy = run.state.phase === 'running' || pending, locked = busy || images.loading !== null
  useEffect(() => { if (!result) { setResultUrl(null); return }; const url = URL.createObjectURL(result.output.blob); setResultUrl(url); return () => URL.revokeObjectURL(url) }, [result])
  const addFiles = (files: File[]) => { if (!locked) { run.reset(); void images.addFiles(files) } }
  return <ExtendedImageStudio kind="metadata"><div className="cn-extendedimage-two cn-metadatastudio">
    <section className="cn-idstudio-panel cn-metadatastudio-input"><h2>{s('inputTitle')}</h2>
      <div className="cn-convertstudio-upload"><FilePicker title={t('removeMeta.choose')} hint={studio('pickerHint')} pickLabel={t('idPhotoStudio.upload')} extra={<ImageCameraInput disabled={locked} onFiles={addFiles} />} accept="image/jpeg,image/png,image/webp" multiple={false} compact={Boolean(item)} loading={images.loading} disabled={locked} onFiles={addFiles} /></div>
      {images.rejected.length ? <div className="cn-flowstudio-rejected" role="alert">{images.rejected.map((entry, index) => <p key={index}><strong>{entry.name}</strong> — {entry.reason}</p>)}</div> : null}
      {item ? <FileList compact files={[{ id: item.id, name: item.name, size: item.size, icon: 'file-earmark-image' }]} disabled={locked} onRemove={images.remove} onClear={images.clear} /> : null}
    </section>
    <section className="cn-idstudio-panel cn-metadatastudio-output" aria-busy={busy}><h2>{s('outputTitle')}</h2>
      {busy ? <p role="status"><Spinner size="sm" /> {t('shared.processing')}</p> : null}
      {run.state.phase === 'idle' && run.state.error ? <><p className="erp-flow-error" role="alert">{run.state.error.message}</p><Button variant="outline-primary" onClick={() => void run.start(task())}>{t('camera.retry')}</Button></> : null}
      <div className="cn-flowstudio-source">{result && resultUrl ? <img src={resultUrl} alt={s('result')} /> : <div className="cn-flowstudio-empty"><Icon name="shield-check" /><strong>{s('emptyTitle')}</strong></div>}</div>
      {result ? <p className="cn-metadatastudio-filename">{formatFileSize(result.output.blob.size)}</p> : null}
      <Button className="cn-flowstudio-run" disabled={!result || locked} onClick={() => { if (result) downloadOutput(result.output) }}><Icon name="download" />{common('result.download')}</Button>
    </section>
  </div></ExtendedImageStudio>
}
