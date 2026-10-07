import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useQrScanner } from '../hooks/useQrScanner'
import type { ScanRead } from '../services/qr-scan'
import { cameraCrop, cameraPoint, detectionBounds } from '../utils/camera-geometry'
import { QrCameraResult } from './QrCameraResult'

interface QrCameraProps {
  onRead: (read: ScanRead) => void
  onClose: () => void
}

function CameraView({ onRead, onClose }: QrCameraProps) {
  const { t } = useTranslation('qr')
  const scanner = useQrScanner(onRead)
  const { video, state, detection, zoom, digitalZoom, maxZoom } = scanner
  const stage = useRef<HTMLDivElement>(null)
  const footer = useRef<HTMLElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [footerHeight, setFooterHeight] = useState(54)

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === element) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
        else setFooterHeight(entry.target.getBoundingClientRect().height)
      }
    })
    observer.observe(element)
    if (footer.current) observer.observe(footer.current)
    return () => observer.disconnect()
  }, [])

  let bounds = null
  if (detection && size.width && size.height) {
    const crop = cameraCrop(detection.width, detection.height, size.width, size.height, digitalZoom)
    const points = detection.points.map(point => cameraPoint({ x: point.x * detection.width, y: point.y * detection.height }, crop))
    bounds = detectionBounds(points, detection.read.format)
  }
  const markerStyle: CSSProperties | undefined = bounds ? { left: `${bounds.x}%`, top: `${bounds.y}%`, width: `${bounds.width}%`, height: `${bounds.height}%` } : undefined

  return (
    <section className={`erp-qr-scanner${detection ? ' erp-qr-scanner--detected' : ''}`} style={{ '--qr-footer-height': `${footerHeight}px` } as CSSProperties} aria-label={t('camera.scanTitle')}>
      <header className="erp-qr-scanner__header">
        <Button variant="link" onClick={onClose} aria-label={t('camera.off')} className="erp-qr-scanner__close"><Icon name="x-lg" /></Button>
        <h2>{t('camera.scanTitle')}</h2>
        <span aria-hidden="true" />
      </header>
      <div className="erp-qr-scanner__stage" ref={stage}>
        <video ref={video} className="erp-qr-scanner__video" style={{ transform: `scale(${digitalZoom})` }} playsInline muted aria-label={t('camera.viewfinder')} />
        {detection ? <img className="erp-qr-scanner__frame" src={detection.frame} style={{ transform: `scale(${digitalZoom})` }} alt={t('camera.captured')} /> : null}
        {state.phase === 'live' ? (
          <>
            {!detection || bounds ? <div className={`erp-qr-scanner__marker${detection ? ' is-detected' : ''}`} style={markerStyle} aria-hidden="true"><i /><i /><i /><i /></div> : null}
            <p className={`erp-qr-scanner__instruction${detection ? ' is-detected' : ''}`} role="status">
              {detection ? <Icon name="check-circle-fill" /> : null}{t(detection ? 'camera.detected' : 'camera.aim')}
            </p>
            <div className="erp-qr-scanner__zoom">
              <Button variant="link" aria-label={t('camera.zoomOut')} disabled={zoom <= 1} onClick={() => scanner.setZoom(zoom - 0.25)}><Icon name="dash-lg" /></Button>
              <input type="range" min={1} max={maxZoom} step={0.05} value={zoom} aria-label={t('camera.zoom')} onChange={event => scanner.setZoom(Number(event.target.value))} />
              <output aria-label={t('camera.zoom')}>{zoom.toFixed(1)}×</output>
              <Button variant="link" aria-label={t('camera.zoomIn')} disabled={zoom >= maxZoom} onClick={() => scanner.setZoom(zoom + 0.25)}><Icon name="plus-lg" /></Button>
            </div>
          </>
        ) : (
          <div className="erp-qr-scanner__status" role={state.phase === 'error' ? 'alert' : 'status'}>
            {state.phase === 'starting' ? <Spinner size="sm" /> : <Icon name="camera-video-off" />}
            <p>{state.phase === 'starting' ? t('camera.starting') : state.message}</p>
            {state.phase === 'error' && scanner.canRetry ? <Button variant="outline-light" onClick={scanner.retry}>{t('shared.retry')}</Button> : null}
          </div>
        )}
      </div>
      <footer className="erp-qr-scanner__footer" ref={footer}>
        {detection ? <QrCameraResult read={detection.read} onResume={scanner.resume} /> : state.phase === 'live' ? <p role="status"><Spinner as="span" size="sm" />{t('camera.searching')}</p> : null}
      </footer>
    </section>
  )
}

export function QrCamera(props: QrCameraProps) {
  const mobile = useMediaQuery('(max-width: 767px), (max-height: 500px) and (pointer: coarse)')
  return mobile ? (
    <Modal show fullscreen onHide={props.onClose} className="erp-qr-scanner-modal" aria-label="QR / Barcode">
      <CameraView {...props} />
    </Modal>
  ) : <CameraView {...props} />
}
