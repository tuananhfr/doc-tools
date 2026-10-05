import type { ReactNode } from 'react'
import { PRO_CONTACT_URL, TEKSHOT_TRIAL_URL } from '../config/pro-offer'
import { ProTrialTrigger } from './ProTrialTrigger'

interface HeroTrialActionsProps {
  /** Nút phiên đứng sau hai nút dùng thử ("Mở trong ERPcons" khi đã đăng nhập). */
  children?: ReactNode
}

/**
 * Hai nút dùng thử ở góc hero của nhánh công khai. `erp-tools-hero__trials` là chỗ
 * bám của `scripts/doc-tools/check-tool-routes.mjs`.
 */
export function HeroTrialActions({ children }: HeroTrialActionsProps) {
  return (
    <div className="erp-tools-hero__trials">
      <ProTrialTrigger url={PRO_CONTACT_URL} product="ERPcons" className="btn btn-sm btn-primary">
        Dùng thử ERPcons
      </ProTrialTrigger>
      <ProTrialTrigger url={TEKSHOT_TRIAL_URL} product="TekshotOS" className="btn btn-sm btn-secondary">
        Dùng thử TekshotOS
      </ProTrialTrigger>
      {children}
    </div>
  )
}
