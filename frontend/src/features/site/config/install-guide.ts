export type InstallPlatformId = 'android' | 'ios' | 'windows' | 'macos' | 'other'

/** Nhãn, trình duyệt và chữ từng bước ở `site:install.platforms.<id>`; `steps` giữ id theo thứ tự. */
export interface InstallPlatform {
  id: InstallPlatformId
  icon: string
  steps: readonly string[]
}

/**
 * Nhãn menu viết theo bản tiếng Việt của trình duyệt; trình duyệt đổi chữ giữa các
 * phiên bản nên bước nào cũng kèm một cách nhận ra bằng hình (biểu tượng, vị trí).
 */
export const INSTALL_PLATFORMS: readonly InstallPlatform[] = [
  { id: 'android', icon: 'android2', steps: ['open', 'menu', 'add', 'install'] },
  { id: 'ios', icon: 'apple', steps: ['open', 'share', 'add', 'confirm'] },
  { id: 'windows', icon: 'windows', steps: ['open', 'icon', 'menu', 'install'] },
  { id: 'macos', icon: 'apple', steps: ['open', 'dock', 'confirm', 'chrome'] },
  { id: 'other', icon: 'display', steps: ['samsung', 'firefox', 'install'] },
]

export const INSTALL_TROUBLESHOOTING = ['update', 'address', 'incognito', 'installed'] as const

export function detectInstallPlatform(userAgent: string): InstallPlatformId {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  // iPadOS báo mình là Macintosh; phân biệt bằng màn cảm ứng ở chỗ gọi.
  if (/macintosh|mac os x/i.test(userAgent)) return 'macos'
  if (/windows/i.test(userAgent)) return 'windows'
  return 'other'
}
