import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui'
import { PRO_CONTACT_URL } from '../config/pro-offer'

interface ProTrialTriggerProps {
  /** Form đăng ký dùng thử; `null` = chưa có. Mặc định là form của ERPCons Pro. */
  url?: string | null
  /** Tên sản phẩm trong câu báo "sắp có". */
  product?: string
  className?: string
  children: ReactNode
}

/** Lối vào form đăng ký dùng thử — mọi lời mời dùng thử trên "Chuyện Nhỏ" đi qua đây. */
export function ProTrialTrigger({ url = PRO_CONTACT_URL, product = 'ERPCons Pro', className, children }: ProTrialTriggerProps) {
  const toast = useToast()
  const { t } = useTranslation('common')

  if (url) {
    return (
      <a className={className} href={url} target="_blank" rel="noopener">
        {children}
      </a>
    )
  }

  // Chưa có form thì vẫn phải có phản hồi khi bấm — nút bấm mà im lặng trông như hỏng.
  return (
    <button type="button" className={className} onClick={() => toast.info(t('pro.soon', { product }))}>
      {children}
    </button>
  )
}
