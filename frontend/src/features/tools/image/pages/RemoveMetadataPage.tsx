import { useEffect, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, FilePicker } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { ExtendedImageStudio } from '../components/ExtendedImageStudio'
import { useImageFiles } from '../hooks/useImageFiles'
import { removeImageMetadata } from '../services/remove-metadata'

type MetadataResult = Awaited<ReturnType<typeof removeImageMetadata>> & { name: string }

export default function RemoveMetadataPage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.metadata' })
  const { t: s } = useTranslation('image', { keyPrefix: 'extendedStudio.metadata' })
  const images = useImageFiles({ multiple: false, revealTarget: '.cn-metadatastudio-output' }), item = images.items[0]
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [result, setResult] = useState<MetadataResult | null>(null), [resultUrl, setResultUrl] = useState<string | null>(null), [original, setOriginal] = useState(false)
  useEffect(() => { setError(''); setResult(null); setOriginal(false) }, [item?.id])
  useEffect(() => { if (!result) { setResultUrl(null); return }; const url = URL.createObjectURL(result.blob); setResultUrl(url); return () => URL.revokeObjectURL(url) }, [result])
  const process = async () => {
    if (!item || busy) return
    setBusy(true); setError('')
    try {
      const output = await removeImageMetadata(item.file)
      const name = `${item.name.replace(/\.[^.]+$/, '')}-khong-exif.${output.extension}`
      setResult({ ...output, name }); setOriginal(false)
      downloadOutput({ name, blob: output.blob })
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('shared.processFailed')) }
    finally { setBusy(false) }
  }
  return <ExtendedImageStudio kind="metadata"><div className="cn-extendedimage-two cn-metadatastudio">
    <section className="cn-idstudio-panel cn-metadatastudio-input"><h2>{s('inputTitle')}</h2><p className="cn-flowstudio-hint">{studio('inputHint')}</p>
      <div className="cn-convertstudio-upload"><FilePicker title={t('removeMeta.choose')} hint={studio('pickerHint')} accept="image/jpeg,image/png,image/webp" multiple={false} compact={Boolean(item)} loading={images.loading} disabled={busy || images.loading !== null} onFiles={files => void images.addFiles(files)} /></div>
      {images.rejected.length ? <div className="cn-flowstudio-rejected" role="alert">{images.rejected.map((entry, index) => <p key={index}><strong>{entry.name}</strong> — {entry.reason}</p>)}</div> : null}
      {item ? <div className="cn-metadatastudio-file"><Icon name="file-earmark-image" /><div><strong>{item.name}</strong><span>{item.width} × {item.height} px · {formatFileSize(item.size)}</span></div></div> : null}
      <p className="cn-idstudio-note"><Icon name="shield-check" />{t('removeMeta.note')}</p>
      <Button className="cn-flowstudio-run" disabled={!item || busy || images.loading !== null} onClick={() => void process()}>{busy ? <Spinner size="sm" /> : <Icon name="shield-check" />}{busy ? t('shared.processing') : t('removeMeta.run')}</Button>
      {error ? <p className="erp-flow-error" role="alert">{error}</p> : null}
    </section>
    <section className="cn-idstudio-panel cn-metadatastudio-output"><h2>{s('outputTitle')}</h2>
      <div className="cn-idstudio-tabs"><button type="button" disabled={!result} aria-pressed={Boolean(result) && !original} onClick={() => setOriginal(false)}>{s('result')}</button><button type="button" disabled={!item} aria-pressed={Boolean(item) && (!result || original)} onClick={() => setOriginal(true)}>{s('original')}</button></div>
      <div className="cn-flowstudio-source">{item ? <img src={resultUrl && !original ? resultUrl : item.url} alt={original || !result ? s('original') : s('result')} /> : <div className="cn-flowstudio-empty"><Icon name="shield-check" /><strong>{s('emptyTitle')}</strong><p>{s('emptyHint')}</p></div>}</div>
      <p className="cn-flowstudio-hint" role="status">{result ? t('removeMeta.done', { width: result.width, height: result.height }) : t('removeMeta.idle')}</p>
      {result ? <><p className="cn-metadatastudio-filename">{result.name} · {formatFileSize(result.blob.size)}</p><Button className="cn-flowstudio-run" onClick={() => downloadOutput({ name: result.name, blob: result.blob })}><Icon name="download" />{s('downloadAgain')}</Button></> : null}
    </section>
  </div></ExtendedImageStudio>
}
