import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function EntertainmentFrame({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation('entertainment')
  return <div className="cn-ent" lang={i18n.language === 'vi' ? 'vi' : 'en'} dir="ltr">{children}<p className="cn-ent-reference">{t('disclaimer')}</p></div>
}
