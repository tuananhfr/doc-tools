import { useEffect, useState } from 'react'

/** Khởi đầu `online: true` cho khớp HTML dựng sẵn; trạng thái thật đọc trong effect, không đọc lúc render (SSR). */
export function useOnlineStatus(): { online: boolean; wasOffline: boolean } {
  const [status, setStatus] = useState({ online: true, wasOffline: false })
  useEffect(() => {
    const update = () => setStatus((previous) => navigator.onLine
      ? { online: true, wasOffline: previous.wasOffline || !previous.online }
      : { online: false, wasOffline: previous.wasOffline })
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return status
}
