import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { useTranslation } from 'react-i18next'
import { cameraAvailable, cameraErrorMessage } from '@/features/tools/hub'
import { readOf, type ScanRead } from '../services/qr-scan'
import { cameraCrop, type CameraPoint } from '../utils/camera-geometry'
import { locateQr } from '../services/qr-locate'
import { autoZoomStep, initialAutoZoomState } from '../utils/auto-zoom'

export type ScannerState = { phase: 'starting' } | { phase: 'live' } | { phase: 'error'; message: string }
export interface CameraDetection {
  read: ScanRead
  points: CameraPoint[]
  frame: string
  width: number
  height: number
}

type ZoomTrack = Omit<MediaStreamTrack, 'getCapabilities' | 'getSettings'> & {
  getCapabilities(): MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
  getSettings(): MediaTrackSettings & { zoom?: number }
}

const SCAN_GAP = 400
const SCAN_SIZE = 1280

/** Owns the stream so an older StrictMode cleanup cannot detach a newer camera. */
export function useQrScanner(onRead: (read: ScanRead) => void) {
  const { t } = useTranslation(['qr', 'common'])
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScannerState>({ phase: 'starting' })
  const [attempt, setAttempt] = useState(0)
  const [detection, setDetection] = useState<CameraDetection | null>(null)
  const [zoom, setZoomValue] = useState(1)
  const [digitalZoom, setDigitalZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(3)
  const handler = useRef(onRead)
  const paused = useRef(false)
  const softwareZoom = useRef(1)
  const track = useRef<ZoomTrack | null>(null)
  const nativeZoom = useRef<{ base: number; step: number } | null>(null)
  const zoomRequest = useRef(0)
  const zoomQueue = useRef(Promise.resolve())
  const zoomValue = useRef(1)
  const zoomLimit = useRef(3)
  const manualZoom = useRef(false)
  const autoZoom = useRef(initialAutoZoomState())

  useEffect(() => { handler.current = onRead }, [onRead])
  const supported = cameraAvailable()

  const resume = useCallback(() => {
    paused.current = false
    setDetection(null)
    autoZoom.current = { ...autoZoom.current, candidate: null, streak: 0 }
  }, [])

  const applyZoom = useCallback((value: number) => {
    const desired = Math.max(1, Math.min(zoomLimit.current, value))
    zoomValue.current = desired
    setZoomValue(desired)
    resume()
    const currentTrack = track.current
    const capability = nativeZoom.current
    const request = ++zoomRequest.current
    if (!currentTrack || !capability) {
      softwareZoom.current = desired
      setDigitalZoom(desired)
      return
    }
    zoomQueue.current = zoomQueue.current.then(async () => {
      if (request !== zoomRequest.current || track.current !== currentTrack) return
      try {
        const step = capability.step || 0.1
        const target = Math.round((desired * capability.base) / step) * step
        await currentTrack.applyConstraints({ advanced: [{ zoom: target } as MediaTrackConstraintSet] })
      } catch {
        if (request !== zoomRequest.current || track.current !== currentTrack) return
        // A reported capability may still be rejected by the browser; crop the actual scan too.
        nativeZoom.current = null
        softwareZoom.current = desired
        setDigitalZoom(desired)
      }
    })
  }, [resume])

  const claimZoom = useCallback(() => { manualZoom.current = true }, [])
  const setZoom = useCallback((value: number) => {
    claimZoom()
    applyZoom(value)
  }, [claimZoom, applyZoom])

  useEffect(() => {
    const element = video.current
    if (!supported || !element) return
    let alive = true
    let stream: MediaStream | null = null
    let timer = 0
    const reader = new BrowserMultiFormatReader()
    const canvas = document.createElement('canvas')
    const snapshot = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let lastLocateAt = 0

    const scan = () => {
      if (!alive) return
      try {
        if (paused.current || !context || element.readyState < 2 || !element.videoWidth || !element.videoHeight) return
        if (!element.clientWidth || !element.clientHeight) return
        const visible = cameraCrop(element.videoWidth, element.videoHeight, element.clientWidth, element.clientHeight, softwareZoom.current)
        // Whole source pixels preserve narrow barcode bars when no downscale is needed.
        const crop = { x: Math.round(visible.x), y: Math.round(visible.y), width: Math.round(visible.width), height: Math.round(visible.height) }
        const scale = Math.min(1, SCAN_SIZE / Math.max(crop.width, crop.height))
        canvas.width = Math.max(1, Math.round(crop.width * scale))
        canvas.height = Math.max(1, Math.round(crop.height * scale))
        context.drawImage(element, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
        let result
        try {
          result = reader.decodeFromCanvas(canvas)
        } catch {
          const now = performance.now()
          if (!manualZoom.current && zoomValue.current < Math.min(3, zoomLimit.current) && now - lastLocateAt >= 800) {
            lastLocateAt = now
            let pixels = context.getImageData(0, 0, canvas.width, canvas.height)
            if (scale < 1) {
              // Detection needs the narrow finder bars that the faster decode resize can blur.
              const locateScale = Math.min(1, 1920 / Math.max(crop.width, crop.height))
              snapshot.width = Math.max(1, Math.round(crop.width * locateScale))
              snapshot.height = Math.max(1, Math.round(crop.height * locateScale))
              const locateContext = snapshot.getContext('2d', { willReadFrequently: true })
              if (locateContext) {
                locateContext.drawImage(element, crop.x, crop.y, crop.width, crop.height, 0, 0, snapshot.width, snapshot.height)
                pixels = locateContext.getImageData(0, 0, snapshot.width, snapshot.height)
              }
            }
            const candidate = locateQr(pixels)
            const suggestion = autoZoomStep(autoZoom.current, candidate, now, zoomValue.current, zoomLimit.current)
            autoZoom.current = suggestion.state
            if (suggestion.zoom !== null) applyZoom(suggestion.zoom)
          }
          return
        }
        const read = readOf(result)
        const points = (result.getResultPoints() ?? []).map(point => ({
          x: (crop.x + point.getX() * crop.width / canvas.width) / element.videoWidth,
          y: (crop.y + point.getY() * crop.height / canvas.height) / element.videoHeight,
        }))
        const snapshotScale = Math.min(1, 1920 / Math.max(element.videoWidth, element.videoHeight))
        snapshot.width = Math.round(element.videoWidth * snapshotScale)
        snapshot.height = Math.round(element.videoHeight * snapshotScale)
        snapshot.getContext('2d')?.drawImage(element, 0, 0, snapshot.width, snapshot.height)
        paused.current = true
        setDetection({ read, points, frame: snapshot.toDataURL('image/jpeg', 0.85), width: element.videoWidth, height: element.videoHeight })
        handler.current(read)
      } catch {
        // Missing codes and temporarily unavailable video frames must not stop the scan loop.
      } finally {
        if (alive) timer = window.setTimeout(scan, SCAN_GAP)
      }
    }

    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then(async media => {
        if (!alive) { media.getTracks().forEach(item => item.stop()); return }
        stream = media
        const cameraTrack = media.getVideoTracks()[0] as ZoomTrack | undefined
        track.current = cameraTrack ?? null
        const capability = cameraTrack?.getCapabilities?.().zoom
        const base = cameraTrack?.getSettings?.().zoom ?? Math.max(1, capability?.min ?? 1)
        nativeZoom.current = capability && capability.max > base ? { base, step: capability.step } : null
        zoomLimit.current = nativeZoom.current && capability ? Math.min(4, capability.max / base) : 3
        setMaxZoom(zoomLimit.current)
        element.srcObject = media
        await element.play()
        if (!alive) return
        setState({ phase: 'live' })
        scan()
      })
      .catch((error: unknown) => {
        if (alive) {
          stream?.getTracks().forEach(item => item.stop())
          setState({ phase: 'error', message: cameraErrorMessage(error) })
        }
      })

    return () => {
      alive = false
      window.clearTimeout(timer)
      stream?.getTracks().forEach(item => item.stop())
      if (stream && element.srcObject === stream) element.srcObject = null
      track.current = null
      nativeZoom.current = null
      zoomRequest.current++
      canvas.width = canvas.height = snapshot.width = snapshot.height = 0
    }
  }, [supported, attempt, applyZoom])

  const retry = useCallback(() => {
    resume()
    softwareZoom.current = 1
    zoomValue.current = 1
    manualZoom.current = false
    autoZoom.current = initialAutoZoomState()
    setDigitalZoom(1)
    setZoomValue(1)
    setState({ phase: 'starting' })
    setAttempt(current => current + 1)
  }, [resume])

  return {
    video, detection, zoom, digitalZoom, maxZoom, setZoom, claimZoom, resume, retry, canRetry: supported,
    state: supported ? state : ({ phase: 'error', message: t('camera.insecure', { reason: t('common:camera.insecure') }) } as ScannerState),
  }
}
