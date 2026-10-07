import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { PRO_CONTACT_URL } from '../config/pro-offer'
import { ProTrialTrigger } from './ProTrialTrigger'

interface ProContactButtonProps {
  className?: string
}

/** Nút "Đăng ký dùng thử" của ERPCons Pro — dùng chung cho thẻ Pro và lời mời sau khi tải. */
export function ProContactButton({ className = '' }: ProContactButtonProps) {
  const { t } = useTranslation('common')
  return (
    <ProTrialTrigger className={`btn btn-primary ${className}`.trim()}>
      {t('pro.signup')}
      {PRO_CONTACT_URL ? <Icon name="box-arrow-up-right" className="ms-2" /> : null}
    </ProTrialTrigger>
  )
}
