import { useSyncExternalStore } from 'react'

/** Chỉ Chromium có sự kiện này; lib.dom của TypeScript chưa khai báo. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** `unavailable`: trình duyệt không cho cài một chạm (Safari, Firefox, hoặc đã cài từ trước). */
export type InstallPromptState = 'unavailable' | 'ready' | 'installed'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// Chrome chỉ bắn sự kiện một lần lúc trang đủ điều kiện, thường trước khi người dùng mở
// /cai-dat; nghe ở cấp module (ToolsRouter import tĩnh trang này) để không lỡ. Cố ý không
// preventDefault: thanh gợi ý cài sẵn có của Chrome Android vẫn hiện như cũ ở mọi trang.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedNow = true
    notify()
  })
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function getSnapshot(): InstallPromptState {
  if (installedNow || isStandalone()) return 'installed'
  return deferredPrompt ? 'ready' : 'unavailable'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Mở hộp thoại cài của trình duyệt; trả `true` khi người dùng đồng ý. */
async function install(): Promise<boolean> {
  const event = deferredPrompt
  if (!event) return false
  // Mỗi sự kiện chỉ gọi prompt() được một lần; từ chối thì Chrome bắn lại ở lần tải trang sau.
  deferredPrompt = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => 'unavailable' as const)
  return { state, install }
}
