import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuthStore } from '@/store/auth.store'
import { useToolsBranch } from './tools-branch'

export interface GuestSessionAction {
  to: string
  label: string
  /** Đã đăng nhập: nút đưa sang đúng công cụ này trong khung app. */
  openInApp: boolean
}

/**
 * Nút phiên của nhánh CÔNG KHAI — "Đăng nhập" hoặc "Mở trong ERPcons".
 *
 * `null` ở nhánh trong app (đã ở trong ERPcons) và lúc `idle` (đang hỏi `/me`):
 * vẽ "Đăng nhập" rồi đổi thành nút khác là nháy.
 */
export function useGuestSessionAction(): GuestSessionAction | null {
  const status = useAuthStore((state) => state.status)
  const { kind } = useToolsBranch()
  const { pathname } = useLocation()

  if (kind !== 'public') return null
  if (status === 'authenticated' || status === 'offline') {
    return { to: `${ROUTES.tools}${pathname.slice(ROUTES.docTools.length)}`, label: 'Mở trong ERPcons', openInApp: true }
  }
  if (status === 'unauthenticated') return { to: ROUTES.login, label: 'Đăng nhập', openInApp: false }
  return null
}
