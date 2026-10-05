import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export interface ToastApi {
  success: (content: ReactNode) => void
  info: (content: ReactNode) => void
  warning: (content: ReactNode) => void
  error: (content: ReactNode) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/**
 * Ban tin ngan cho nguoi dung (thay `message` cua Ant Design):
 *
 *   const toast = useToast()
 *   toast.success('Đã lưu khách hàng')
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast phải nằm trong <ToastProvider>')
  }
  return context
}
