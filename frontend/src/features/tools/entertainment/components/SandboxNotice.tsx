import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function SandboxNotice() {
  const { t } = useTranslation('entertainment')
  return <aside className="cn-ent-notice"><strong>{t('sandbox.title')}</strong><p>{t('sandbox.description')}</p><p>{t('disclaimer')}</p><Link to="/kham-pha-giai-tri">{t('sandbox.back')}</Link></aside>
}
