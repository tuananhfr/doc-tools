import { useSyncExternalStore } from 'react'

function subscribe(notify: () => void) {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}

/** `navigator.onLine` chỉ đáng tin khi báo `false` (mất mạng chắc chắn); `true` không bảo đảm có Internet. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
