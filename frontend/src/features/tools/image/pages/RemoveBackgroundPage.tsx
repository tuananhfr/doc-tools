import { useEffect, useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FilePicker } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { withBase } from '@/utils/url'
import { BackgroundRemovalControls } from '../components/BackgroundRemovalControls'
import { ImageUtilityStudio } from '../components/ImageUtilityStudio'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { HandoffButton } from '../components/HandoffButton'
import { ImageCameraInput } from '../components/ImageCameraInput'
import { useMobileImageReveal } from '../hooks/useMobileImageReveal'
import { idPhotoFill } from '../utils/handoff-file'

export default function RemoveBackgroundPage() {
  const { t } = useTranslation('image')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.background' })
  const { t: s } = useTranslation('image', { keyPrefix: 'utilityStudio.background' })
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const tool = useBackgroundRemoval()
  const [selected, setSelected] = useState<File | null>(null), [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [original, setOriginal] = useState(false), [sampleBusy, setSampleBusy] = useState(false), [sampleFailed, setSampleFailed] = useState(false)
  useEffect(() => { if (!selected) { setOriginalUrl(null); return }; const url = URL.createObjectURL(selected); setOriginalUrl(url); return () => URL.revokeObjectURL(url) }, [selected])
  const open = async (file: File) => { setSelected(file); setOriginal(false); await tool.open(file) }
  const sample = async () => {
    setSampleBusy(true); setSampleFailed(false)
    try { const response = await fetch(withBase('/assets/id-photo/portrait-demo-v2.png')); if (!response.ok) throw new Error('SAMPLE_FAILED'); await open(new File([await response.blob()], 'portrait-demo.png', { type: 'image/png' })) }
    catch { setSampleFailed(true) } finally { setSampleBusy(false) }
  }
  const ready = tool.phase === 'ready', visible = Boolean(tool.name) && !['error', 'cancelled'].includes(tool.phase)
  useMobileImageReveal(tool.name ? [`${tool.name}:${selected?.lastModified}`] : [], '.cn-backgroundstudio-output')
  return <ImageUtilityStudio kind="background"><div className="cn-idstudio-editor cn-backgroundstudio-editor">
    <section className="cn-idstudio-panel cn-convertstudio-upload"><h2>{s('inputTitle')}</h2>
      <FilePicker accept="image/jpeg,image/png,image/webp" multiple={false} title={t('removeBg.choose')} hint={studio('formats')} pickLabel={photo('upload')} extra={<ImageCameraInput disabled={tool.busy || sampleBusy} onFiles={files => { if (files[0]) void open(files[0]) }} />} compact={Boolean(tool.name)} loading={null} disabled={tool.busy || sampleBusy} onFiles={files => { if (files[0]) void open(files[0]) }} />
      <div className="cn-idstudio-samples"><h3>{photo('sampleTitle')}</h3><button type="button" disabled={tool.busy || sampleBusy} onClick={() => void sample()}><img src={withBase('/assets/id-photo/portrait-demo-v2.png')} alt="" /><span>{photo('sampleLabel')}<small>{photo('sampleDisclosure')}</small></span><Icon name="arrow-right" /></button></div>
      {sampleFailed ? <p className="cn-imageutility-error" role="alert">{s('sampleFailed')}</p> : null}
      {tool.name ? <p className="cn-backgroundstudio-name">{tool.name}</p> : null}
    </section>
    <section className="cn-idstudio-panel cn-backgroundstudio-settings"><h2>{s('optionsTitle')}</h2>
      <div className="cn-backgroundstudio-status" role={tool.phase === 'error' ? 'alert' : 'status'} aria-live="polite">{tool.busy ? <Spinner size="sm" /> : <Icon name={ready ? 'check-circle-fill' : 'magic'} />}<p>{tool.message || t('removeBg.idle')}</p></div>
      <BackgroundRemovalControls {...tool} showPicker={false} ready={ready} />
      {!ready && !tool.busy ? <p className="cn-idstudio-note">{s('settingsHint')}</p> : null}
      <p className="cn-idstudio-note"><Icon name="brush" />{s('brushHint')}</p>
    </section>
    <section className="cn-idstudio-panel cn-backgroundstudio-output"><h2>{s('outputTitle')}</h2>
      {tool.busy ? <p role="status" className="cn-idstudio-note"><Spinner as="span" size="sm" /> {tool.message}</p> : tool.phase === 'error' || tool.phase === 'cancelled' ? <p role="alert" className="cn-imageutility-error">{tool.message}</p> : null}
      <div className="cn-idstudio-tabs"><button type="button" disabled={!visible} aria-pressed={!original} onClick={() => setOriginal(false)}>{s('result')}</button><button type="button" disabled={!originalUrl || !visible} aria-pressed={original} onClick={() => setOriginal(true)}>{s('original')}</button></div>
      <div className="cn-backgroundstudio-stage" aria-busy={tool.busy}>
        <div hidden={visible}><img className="cn-backgroundstudio-demo" src={withBase('/assets/id-photo/portrait-demo-v2.png')} alt={photo('samplePreview')} /><strong>{s('emptyTitle')}</strong><p>{s('emptyHint')}</p></div>
        {originalUrl ? <img src={originalUrl} alt={s('original')} hidden={(!original && !tool.busy) || !visible} /> : null}
        <canvas ref={tool.canvas} hidden={original || !visible || tool.busy} aria-label={t('removeBg.preview')} style={{ touchAction: tool.brush === 'off' ? 'auto' : 'none', cursor: tool.brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={tool.startStroke} onPointerMove={tool.brushAt} onPointerUp={tool.endStroke} onPointerCancel={tool.endStroke} onLostPointerCapture={tool.endStroke} />
      </div>
      <p className="cn-idstudio-note">{s('pngHint')}</p>
      <div className="cn-backgroundstudio-download"><Button disabled={!ready} onClick={tool.save}><Icon name="download" />{t('removeBg.download')}</Button><HandoffButton target="id-photo" label={t('handoff.toIdPhoto')} disabled={!ready} file={() => tool.toFile(idPhotoFill(tool.background))} /></div>
    </section>
  </div></ImageUtilityStudio>
}
