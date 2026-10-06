import { useCallback, useEffect, useRef, useState } from 'react'
import { accuracyOf, circularMean, circularSpread, headingOf, stabilityOf, type HeadingSample, type Stability } from '../utils/device-heading'

export type HeadingStatus = 'idle' | 'starting' | 'live' | 'unsupported' | 'insecure' | 'denied' | 'no-signal'

export interface HeadingReading {
  heading: number
  spread: number | null
  stability: Stability | null
  accuracy: number | null
}

/** Số lần đọc gần nhất để tính trung bình + độ ổn định (~1 giây ở 60 Hz). */
const WINDOW = 40
/** Bấm "Đo ngay" mà chừng này vẫn chưa có lần đọc nào có neo Bắc → coi như máy không có la bàn. */
const SIGNAL_TIMEOUT = 3000

type PermissionAware = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

function screenAngle(): number {
  return typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0
}

/**
 * La bàn của điện thoại. CHỈ xin quyền khi người dùng bấm "Đo ngay" (spec v1.1 §9)
 * — iOS bắt buộc lời xin phải nằm trong một lần chạm. Không lưu luồng cảm biến:
 * chỉ giữ cửa sổ 40 lần đọc gần nhất trong RAM để làm mượt.
 */
export function useDeviceHeading() {
  const [status, setStatus] = useState<HeadingStatus>('idle')
  const [reading, setReading] = useState<HeadingReading | null>(null)
  const samples = useRef<number[]>([])
  const detach = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    detach.current?.()
    detach.current = null
    samples.current = []
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(async () => {
    stop()
    setReading(null)
    if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unsupported')
      return
    }
    // Cảm biến hướng chỉ mở trên HTTPS / localhost; mở qua http://<IP LAN> là im lặng không có sự kiện nào.
    if (!window.isSecureContext) {
      setStatus('insecure')
      return
    }
    setStatus('starting')
    const permissionApi = DeviceOrientationEvent as PermissionAware
    if (typeof permissionApi.requestPermission === 'function') {
      try {
        if ((await permissionApi.requestPermission()) !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        setStatus('denied')
        return
      }
    }

    let gotSignal = false
    let frame = 0
    let latest: HeadingReading | null = null
    // Cảm biến bắn 60–100 lần/giây; vẽ lại mặt la bàn mỗi lần là giật trên máy yếu — gộp theo khung hình.
    const flush = () => {
      frame = 0
      setReading(latest)
      setStatus('live')
    }
    const onEvent = (event: Event) => {
      const sample = event as DeviceOrientationEvent & HeadingSample
      const heading = headingOf(
        { alpha: sample.alpha, absolute: event.type === 'deviceorientationabsolute' || sample.absolute, webkitCompassHeading: sample.webkitCompassHeading, webkitCompassAccuracy: sample.webkitCompassAccuracy },
        screenAngle(),
      )
      if (heading === null) return
      gotSignal = true
      samples.current = [...samples.current.slice(-(WINDOW - 1)), heading]
      const spread = circularSpread(samples.current)
      latest = { heading: circularMean(samples.current) ?? heading, spread, stability: stabilityOf(spread), accuracy: accuracyOf(sample) }
      if (!frame) frame = window.requestAnimationFrame(flush)
    }
    // Android Chrome: `deviceorientationabsolute` mới neo theo Bắc; `deviceorientation` thường là góc tương đối.
    const absolute = 'ondeviceorientationabsolute' in window
    const type = absolute ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(type, onEvent)
    const timer = window.setTimeout(() => {
      if (!gotSignal) {
        stop()
        setStatus('no-signal')
      }
    }, SIGNAL_TIMEOUT)
    detach.current = () => {
      window.removeEventListener(type, onEvent)
      window.clearTimeout(timer)
      window.cancelAnimationFrame(frame)
    }
  }, [stop])

  const halt = useCallback(() => {
    stop()
    setStatus('idle')
  }, [stop])

  return { status, reading, start, stop: halt }
}
