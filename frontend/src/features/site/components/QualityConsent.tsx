import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { qualityConsent, qualityEnabled, setQualityConsent, subscribeQualityConsent } from '@/features/tools/hub/services/quality-events'

export function QualityConsent({ disclosure = false }: { disclosure?: boolean }) {
  const { t } = useTranslation('quality')
  const consent = useSyncExternalStore(subscribeQualityConsent, qualityConsent, () => false)
  if (!qualityEnabled() && !disclosure) return null
  return <section className="cn-quality-consent">
    {qualityEnabled() ? <label><input type="checkbox" checked={consent} onChange={event => setQualityConsent(event.target.checked)} /> {t('consent')}</label> : <p>{t('disabled')}</p>}
    <p>{t('notice')}</p><p>{t('retention')}</p>
  </section>
}
