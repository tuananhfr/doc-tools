import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { CAMERA_INSECURE, cameraAvailable, cameraErrorMessage } from '@/features/tools/hub'
import { readOf, type ScanRead } from '../services/qr-scan'

export type ScannerState = { phase: 'starting' } | { phase: 'live' } | { phase: 'error'; message: string }

const INSECURE = `${CAMERA_INSECURE} Chụp mã bằng ứng dụng máy ảnh rồi chọn ảnh từ máy.`

/** Giữa hai lần thử: đọc dày hơn chỉ làm nóng máy. */
const SCAN_GAP = 400
/** Sau một lần đọc được: đủ lâu để kịp đưa mã khác vào khung hình. */
const READ_GAP = 1500
/** Cạnh dài của khung hình đem quét — camera 4K để nguyên cỡ là mỗi lần thử mất cả trăm ms. */
const SCAN_SIZE = 1280

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Quét mã liên tục bằng camera cho MỘT lần mở: xin quyền lúc mount, tắt camera
 * lúc unmount — đèn báo camera còn sáng sau khi rời màn là người dùng mất tin.
 *
 * Tự giữ luồng camera và tự chụp khung hình đem quét, KHÔNG dùng
 * `decodeFromConstraints` của zxing: hàm đó gắn luồng vào thẻ video rồi lúc dừng
 * lại gỡ nguồn của thẻ — hai lượt mở sát nhau (StrictMode, bấm Thử lại) thì lượt
 * cũ gỡ luôn luồng của lượt mới, ô ngắm đen mà không lỗi nào báo.
 *
 * `onRead` chạy mỗi lần đọc được, kể cả khi vẫn là mã đang nằm trước ống kính;
 * nơi gọi tự bỏ lượt trùng.
 */
export function useQrScanner(onRead: (read: ScanRead) => void) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ScannerState>({ phase: 'starting' })
  const [attempt, setAttempt] = useState(0)

  const handler = useRef(onRead)
  useEffect(() => {
    handler.current = onRead
  }, [onRead])

  const supported = cameraAvailable()

  useEffect(() => {
    const element = video.current
    if (!supported || !element) return
    let alive = true
    let stream: MediaStream | null = null
    let timer = 0

    const reader = new BrowserMultiFormatReader()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const scan = () => {
      if (!alive) return
      let gap = SCAN_GAP
      if (context && element.videoWidth > 0) {
        const scale = Math.min(1, SCAN_SIZE / Math.max(element.videoWidth, element.videoHeight))
        canvas.width = Math.round(element.videoWidth * scale)
        canvas.height = Math.round(element.videoHeight * scale)
        context.drawImage(element, 0, 0, canvas.width, canvas.height)
        try {
          handler.current(readOf(reader.decodeFromCanvas(canvas)))
          gap = READ_GAP
        } catch {
          // zxing ném NotFoundException khi khung hình không có mã — xảy ra vài lần mỗi giây, không phải sự cố.
        }
      }
      timer = window.setTimeout(scan, gap)
    }

    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then(async (media) => {
        // StrictMode / tắt camera trước khi người dùng kịp bấm Cho phép: luồng tới muộn phải tắt ngay.
        if (!alive) return stop(media)
        stream = media
        element.srcObject = media
        await element.play().catch(() => undefined)
        if (!alive) return
        setState({ phase: 'live' })
        scan()
      })
      .catch((error: unknown) => {
        if (alive) setState({ phase: 'error', message: cameraErrorMessage(error) })
      })

    return () => {
      alive = false
      window.clearTimeout(timer)
      stop(stream)
      if (stream && element.srcObject === stream) element.srcObject = null
      canvas.width = canvas.height = 0
    }
  }, [supported, attempt])

  const retry = useCallback(() => {
    setState({ phase: 'starting' })
    setAttempt((current) => current + 1)
  }, [])

  return { video, state: supported ? state : ({ phase: 'error', message: INSECURE } as ScannerState), canRetry: supported, retry }
}
