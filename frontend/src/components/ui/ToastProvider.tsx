import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { ToastContext } from './toast-context'
import type { ToastApi, ToastTone } from './toast-context'

interface ToastItem {
  id: number
  tone: ToastTone
  content: ReactNode
}

const TONE_ICON: Record<ToastTone, string> = {
  success: 'check-circle-fill',
  info: 'info-circle-fill',
  warning: 'exclamation-triangle-fill',
  danger: 'x-circle-fill',
}

const DURATION = 4000

/**
 * Thong bao noi (thay `message` cua Ant Design).
 *
 * Moi toast deu co ICON + NHAN + noi dung - khong bao gio chi dung mau de
 * truyen dat trang thai (ERPcons_Design_System.md, muc 05 & 10).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, content: ReactNode) => {
      const id = nextId.current++
      setItems((list) => [...list, { id, tone, content }])
      window.setTimeout(() => remove(id), DURATION)
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (content) => push('success', content),
      info: (content) => push('info', content),
      warning: (content) => push('warning', content),
      error: (content) => push('danger', content),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="erp-toaster" role="region" aria-label={t('ui.toastRegion')}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`erp-toast erp-toast--${item.tone}`}
            role={item.tone === 'danger' ? 'alert' : 'status'}
          >
            <Icon
              name={TONE_ICON[item.tone]}
              className={`erp-toast__icon erp-text-${item.tone}`}
              label={t(`ui.toastTone.${item.tone}`)}
            />
            <div className="flex-grow-1">{item.content}</div>
            <button
              type="button"
              className="erp-toast__close"
              onClick={() => remove(item.id)}
              aria-label={t('ui.toastClose')}
            >
              <Icon name="x-lg" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
