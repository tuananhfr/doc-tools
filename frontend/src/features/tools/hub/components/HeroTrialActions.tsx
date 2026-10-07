import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('common')
  return (
    <div className="erp-tools-hero__trials">
      <ProTrialTrigger url={PRO_CONTACT_URL} product="ERPcons" className="btn btn-sm btn-primary">
        {t('hero.trialErpcons')}
      </ProTrialTrigger>
      <ProTrialTrigger url={TEKSHOT_TRIAL_URL} product="TekShot AI" className="btn btn-sm btn-secondary">
        {t('hero.trialTekshot')}
      </ProTrialTrigger>
      {children}
    </div>
  )
}
