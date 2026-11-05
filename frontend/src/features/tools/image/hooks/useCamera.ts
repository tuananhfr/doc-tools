import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraAvailable, cameraErrorMessage } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import { createCanvas, encodeCanvas, releaseCanvas } from '../services/image-codec'

type CameraState = { phase: 'starting' } | { phase: 'live' } | { phase: 'error'; message: string }
export type CameraFacing = 'user' | 'environment'

/** `torch` chưa có trong kiểu DOM của TypeScript; chỉ Chrome trên Android hỗ trợ. */
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Luồng camera cho MỘT lần mở: xin quyền lúc mount, tắt camera lúc unmount (đèn
 * báo camera còn sáng sau khi đóng cửa sổ là người dùng mất tin ngay).
 * Camera sau dành cho tài liệu; công cụ chân dung có thể ưu tiên camera trước.
 */
export function useCamera(initialFacing: CameraFacing = 'environment') {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>({ phase: 'starting' })
  /** null = camera này không có đèn. */
  const [torch, setTorch] = useState<boolean | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [facing, setFacing] = useState<CameraFacing>(initialFacing)

  const supported = cameraAvailable()

  useEffect(() => {
    if (!supported) return
    let alive = true
    setState({ phase: 'starting' })
    setTorch(null)
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1440 } } })
      .then(async (media) => {
        // StrictMode / đóng cửa sổ trước khi người dùng kịp bấm Cho phép: luồng tới muộn phải tắt ngay.
        if (!alive) return stop(media)
        stream.current = media
        if (video.current) {
          video.current.srcObject = media
          await video.current.play().catch(() => undefined)
        }
        if (!alive) return
        const capabilities = media.getVideoTracks()[0]?.getCapabilities?.() as TorchCapabilities | undefined
        setTorch(capabilities?.torch ? false : null)
        setState({ phase: 'live' })
      })
      .catch((error: unknown) => {
        if (alive) setState({ phase: 'error', message: cameraErrorMessage(error) })
      })
    return () => {
      alive = false
      stop(stream.current)
      stream.current = null
      if (video.current) video.current.srcObject = null
    }
  }, [supported, attempt, facing])

  const switchCamera = useCallback(() => {
    setState({ phase: 'starting' })
    setFacing(current => current === 'user' ? 'environment' : 'user')
  }, [])

  const retry = useCallback(() => {
    setState({ phase: 'starting' })
    setAttempt((current) => current + 1)
  }, [])

  const toggleTorch = useCallback(async () => {
    const track = stream.current?.getVideoTracks()[0]
    if (!track || torch === null) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
      setTorch(!torch)
    } catch {
      // Máy báo có đèn mà không bật được: ẩn nút, không để một nút bấm không ăn.
      setTorch(null)
    }
  }, [torch])

  /** Chụp khung hình đang hiện ở độ phân giải thật của camera, không phải cỡ ô xem. */
  const capture = useCallback(async (): Promise<{ blob: Blob; width: number; height: number }> => {
    const element = video.current
    if (!element || element.videoWidth === 0) throw new Error(translate('image:camera.notReady'))
    const { canvas, context } = createCanvas({ width: element.videoWidth, height: element.videoHeight })
    try {
      context.drawImage(element, 0, 0)
      return { blob: await encodeCanvas(canvas, 'jpeg'), width: canvas.width, height: canvas.height }
    } finally {
      releaseCanvas(canvas)
    }
  }, [])

  return { video, state: supported ? state : ({ phase: 'error', message: translate('image:camera.insecure', { reason: translate('common:camera.insecure') }) } as CameraState), canRetry: supported, torch, toggleTorch, switchCamera, retry, capture }
}
