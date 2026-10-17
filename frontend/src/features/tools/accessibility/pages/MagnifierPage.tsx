import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { AccessibilityStudio } from '../components/AccessibilityStudio'

type Facing = 'environment' | 'user'

export default function MagnifierPage() {
  const { t } = useTranslation('accessibility')
  const { t: s } = useTranslation('accessibility', { keyPrefix: 'studio.magnifier' })
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [open, setOpen] = useState(false)
  const [facing, setFacing] = useState<Facing>('environment')
  const [frozen, setFrozen] = useState(false)
  const [zoom, setZoom] = useState(2)
  const [contrast, setContrast] = useState(false)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const requestId = useRef(0)
  const stop = () => {
    requestId.current++
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setOpen(false); setFrozen(false); setStarting(false)
  }
  useEffect(() => () => { requestId.current++; stream.current?.getTracks().forEach((track) => track.stop()) }, [])
  const start = async (nextFacing: Facing) => {
    if (!navigator.mediaDevices?.getUserMedia) { setError(t('magnifier.noCamera')); return }
    stop()
    const request = ++requestId.current
    setStarting(true); setError('')
    try {
      // Tắt track cũ TRƯỚC khi xin camera kia: nhiều điện thoại không mở được hai camera cùng lúc.
      // `ideal` thay vì `exact`: máy chỉ có một camera (laptop) vẫn mở được, không văng OverconstrainedError.
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing } }, audio: false })
      if (request !== requestId.current) { next.getTracks().forEach(track => track.stop()); return }
      stream.current = next
      if (video.current) { video.current.srcObject = next; await video.current.play() }
      if (request !== requestId.current) return
      setFacing(nextFacing); setOpen(true); setError('')
    } catch { if (request === requestId.current) { stop(); setError(t('magnifier.cameraFailed')) } }
    finally { if (request === requestId.current) setStarting(false) }
  }
  const switchOrOpen = () => start(open ? (facing === 'environment' ? 'user' : 'environment') : facing)
  const freeze = () => {
    if (!video.current) return
    if (video.current.paused) { void video.current.play(); setFrozen(false) } else { video.current.pause(); setFrozen(true) }
  }
  return <AccessibilityStudio kind="magnifier"><div className="cn-accessstudio-columns cn-magnifierstudio">
    <section className="cn-idstudio-panel cn-magnifierstudio-preview"><h2>{s('previewTitle')}</h2>
      {!open ? <div className="cn-magnifier-empty"><span aria-hidden="true"><Icon name="zoom-in" /></span><strong>{s('emptyTitle')}</strong><p>{starting ? s('opening') : t('magnifier.hint')}</p></div> : null}
      {/* The camera startup uses this ref before the preview becomes visible. */}
      <div className="cn-magnifier-stage" hidden={!open}>
        <video ref={video} playsInline muted aria-label={t('magnifier.preview')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: contrast ? 'grayscale(1) contrast(2.2)' : undefined }} />
      </div>
      <p className="cn-accessstudio-note" role="status"><Icon name={open ? frozen ? 'pause-circle' : 'camera-video' : 'camera'} />{open ? frozen ? t('magnifier.frozen') : t('magnifier.live') : t('shared.ready')}</p>
    </section>
    <section className="cn-idstudio-panel cn-magnifierstudio-controls"><h2>{s('optionsTitle')}</h2>
      <label className="cn-accessstudio-label">{t('magnifier.zoom', { zoom })}<Form.Range min={1} max={6} step={0.5} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="cn-magnifier-actions"><Button disabled={starting} onClick={switchOrOpen}><Icon name={open ? 'arrow-repeat' : 'camera-video'} />{starting ? s('opening') : open ? t('magnifier.switchCamera') : t('magnifier.openCamera')}</Button><Button variant="outline-primary" disabled={!open} onClick={freeze}><Icon name={frozen ? 'play' : 'pause'} />{frozen ? t('magnifier.resume') : t('magnifier.freeze')}</Button><Button variant="outline-primary" disabled={!open} onClick={() => setContrast(current => !current)} aria-pressed={contrast}><Icon name="circle-half" />{contrast ? t('magnifier.contrastOff') : t('magnifier.contrastOn')}</Button><Button variant="outline-danger" disabled={!open && !starting} onClick={stop}><Icon name="stop-circle" />{t('magnifier.closeCamera')}</Button></div>
      {open ? <p className="cn-accessstudio-note">{facing === 'user' ? t('magnifier.frontCamera') : t('magnifier.backCamera')}</p> : null}
      {error ? <p role="alert" className="cn-accessstudio-error">{error}</p> : null}
      <p className="cn-accessstudio-note">{s('zoomHint')}</p><p className="cn-accessstudio-note"><Icon name="shield-check" />{t('magnifier.privacy')}</p>
    </section>
  </div></AccessibilityStudio>
}
