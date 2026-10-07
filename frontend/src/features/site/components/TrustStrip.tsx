import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { TRUST_ITEMS } from '../config/home-content'

export function TrustStrip() {
  const { t } = useTranslation('site')
  return (
    <section id="du-lieu" className="cn-trust-strip" aria-label={t('trust.label')}>
      <ul className="cn-container cn-trust-items">
        {TRUST_ITEMS.map((item) => <li key={item.id}><Icon name={item.icon} /><div><strong>{t(`trust.items.${item.id}.title`)}</strong><span>{t(`trust.items.${item.id}.description`)}</span></div></li>)}
      </ul>
    </section>
  )
}
