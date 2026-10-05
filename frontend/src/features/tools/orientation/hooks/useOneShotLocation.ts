import { useCallback, useState } from 'react'

export interface Coordinates {
  latitude: number
  longitude: number
}

export type LocationStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable'

/**
 * Hỏi vị trí MỘT lần, chỉ khi người dùng bấm (spec v1.1 §17: GPS phải xin rõ).
 * Không theo dõi liên tục, không lưu — vị trí chỉ để tính mặt trời. Độ chính xác
 * thấp là đủ: mặt trời lệch chưa tới 0,1° khi vị trí sai vài km.
 */
export function useOneShotLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)

  /** `onFound` chạy đúng một lần khi có toạ độ — nơi gọi điền thẳng vào ô, không cần effect theo dõi. */
  const ask = useCallback((onFound?: (coordinates: Coordinates) => void) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('asking')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const found = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        setCoordinates(found)
        setStatus('ok')
        onFound?.(found)
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    )
  }, [])

  return { status, coordinates, ask, set: setCoordinates }
}
