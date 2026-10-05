import { Icon } from '@/components/ui'
import { PRO_CONTACT_URL } from '../config/pro-offer'
import { ProTrialTrigger } from './ProTrialTrigger'

interface ProContactButtonProps {
  className?: string
}

/** Nút "Đăng ký dùng thử" của ERPCons Pro — dùng chung cho thẻ Pro và lời mời sau khi tải. */
export function ProContactButton({ className = '' }: ProContactButtonProps) {
  return (
    <ProTrialTrigger className={`btn btn-primary ${className}`.trim()}>
      Đăng ký dùng thử
      {PRO_CONTACT_URL ? <Icon name="box-arrow-up-right" className="ms-2" /> : null}
    </ProTrialTrigger>
  )
}
