import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'

type Facing = 'environment' | 'user'

export default function MagnifierPage() {
  const { t } = useTranslation('accessibility')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.magnifier' })
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [open, setOpen] = useState(false)
  const [facing, setFacing] = useState<Facing>('environment')
  const [frozen, setFrozen] = useState(false)
  const [zoom, setZoom] = useState(2)
  const [contrast, setContrast] = useState(false)
  const [error, setError] = useState('')
  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setOpen(false); setFrozen(false)
  }
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()) }, [])
  const start = async (nextFacing: Facing) => {
    if (!navigator.mediaDevices?.getUserMedia) { setError(t('magnifier.noCamera')); return }
    try {
      // Tắt track cũ TRƯỚC khi xin camera kia: nhiều điện thoại không mở được hai camera cùng lúc.
      stop()
      // `ideal` thay vì `exact`: máy chỉ có một camera (laptop) vẫn mở được, không văng OverconstrainedError.
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing } }, audio: false })
      stream.current = next
      if (video.current) { video.current.srcObject = next; await video.current.play() }
      setFacing(nextFacing); setOpen(true); setError('')
    } catch { stop(); setError(t('magnifier.cameraFailed')) }
  }
  const switchOrOpen = () => start(open ? (facing === 'environment' ? 'user' : 'environment') : facing)
  const freeze = () => {
    if (!video.current) return
    if (video.current.paused) { void video.current.play(); setFrozen(false) } else { video.current.pause(); setFrozen(true) }
  }
  return <ToolBoard className="cn-magnifier-workspace" layout="compact" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>} side={<div className="erp-tool-result" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="camera" /></span><div><h2>{t('magnifier.preview')}</h2><p>{studio('resultHint')}</p></div></div>
    <div className="cn-magnifier-status"><Icon name={open ? frozen ? 'pause-circle' : 'camera-video' : 'camera'} /><p className="erp-tool-result__value">{open ? frozen ? t('magnifier.frozen') : t('magnifier.live') : t('shared.ready')}</p></div>
    {open ? <p className="erp-tool-result__note">{facing === 'user' ? t('magnifier.frontCamera') : t('magnifier.backCamera')}</p> : null}
    <p className="erp-tool-result__note">{open ? '' : `${t('magnifier.hint')} `}{t('magnifier.privacy')}</p>
    {error ? <p role="alert" className="erp-tool-result__note">{error}</p> : null}
  </div>}>
    <ToolPanel title={t('magnifier.title')} actions={<span className="cn-studio-small-icon"><Icon name="zoom-in" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      {!open ? <div className="cn-magnifier-empty"><span aria-hidden="true"><Icon name="zoom-in" /></span><h2>{studio('emptyTitle')}</h2><p>{t('magnifier.hint')}</p></div> : null}
      {/* The camera startup uses this ref before the preview becomes visible. */}
      <div className="cn-magnifier-stage" hidden={!open}>
        <video ref={video} playsInline muted aria-label={t('magnifier.preview')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: contrast ? 'grayscale(1) contrast(2.2)' : undefined }} />
      </div>
      <label className="erp-flow-field__label mt-3">{t('magnifier.zoom', { zoom })}<Form.Range min={1} max={6} step={0.5} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="cn-magnifier-actions"><Button onClick={switchOrOpen}><Icon name={open ? 'arrow-repeat' : 'camera-video'} />{open ? t('magnifier.switchCamera') : t('magnifier.openCamera')}</Button><Button variant="outline-secondary" disabled={!open} onClick={freeze}><Icon name={frozen ? 'play' : 'pause'} />{frozen ? t('magnifier.resume') : t('magnifier.freeze')}</Button><Button variant="outline-secondary" disabled={!open} onClick={() => setContrast((current) => !current)} aria-pressed={contrast}><Icon name="circle-half" />{contrast ? t('magnifier.contrastOff') : t('magnifier.contrastOn')}</Button><Button variant="outline-secondary" disabled={!open} onClick={stop}><Icon name="stop-circle" />{t('magnifier.closeCamera')}</Button></div>
    </ToolPanel>
  </ToolBoard>
}
