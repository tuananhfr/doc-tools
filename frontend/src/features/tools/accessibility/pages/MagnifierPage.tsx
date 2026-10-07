import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'

export default function MagnifierPage() {
  const { t } = useTranslation('accessibility')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [open, setOpen] = useState(false)
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
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setError(t('magnifier.noCamera')); return }
    try {
      stop()
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      stream.current = next
      if (video.current) { video.current.srcObject = next; await video.current.play() }
      setOpen(true); setError('')
    } catch { stop(); setError(t('magnifier.cameraFailed')) }
  }
  const freeze = () => {
    if (!video.current) return
    if (video.current.paused) { void video.current.play(); setFrozen(false) } else { video.current.pause(); setFrozen(true) }
  }
  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('magnifier.preview')}</p>
    <div style={{ overflow: 'hidden', borderRadius: 12, background: '#111', aspectRatio: '4 / 3', display: 'grid', placeItems: 'center' }}>
      <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: contrast ? 'grayscale(1) contrast(2.2)' : undefined }} />
    </div>
    <p className="erp-tool-result__note mt-3">{open ? frozen ? t('magnifier.frozen') : t('magnifier.live') : t('magnifier.hint')} {t('magnifier.privacy')}</p>
    {error ? <p role="alert" className="erp-tool-result__note">{error}</p> : null}
  </div>}>
    <ToolPanel title={t('magnifier.title')}>
      <label className="erp-flow-field__label">{t('magnifier.zoom', { zoom })}<Form.Range min={1} max={6} step={0.5} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="d-flex flex-wrap gap-2"><Button onClick={start}>{open ? t('magnifier.switchCamera') : t('magnifier.openCamera')}</Button><Button variant="outline-secondary" disabled={!open} onClick={freeze}>{frozen ? t('magnifier.resume') : t('magnifier.freeze')}</Button><Button variant="outline-secondary" disabled={!open} onClick={() => setContrast((current) => !current)}>{contrast ? t('magnifier.contrastOff') : t('magnifier.contrastOn')}</Button><Button variant="outline-secondary" disabled={!open} onClick={stop}>{t('magnifier.closeCamera')}</Button></div>
    </ToolPanel>
  </ToolBoard>
}
