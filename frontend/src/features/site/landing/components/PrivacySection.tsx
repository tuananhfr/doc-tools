import Image from 'next/image'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'
import { PRIVACY_ROWS } from '../config/landing-content'

export function PrivacySection() {
  const { t } = useTranslation('site')
  return (
    <section id="du-lieu" className="cn-landing-privacy" aria-labelledby="cn-landing-privacy-title">
      <Image src={withBase('/landing/privacy.webp')} alt="" fill sizes="100vw" className="cn-landing-privacy-art" />
      <div className="cn-landing-container cn-landing-section"><div className="cn-landing-privacy-copy"><h2 id="cn-landing-privacy-title">{t('landing.privacy.title')}</h2><p className="cn-landing-body">{t('landing.privacy.body')}</p><ul className="cn-landing-feature-rows">{PRIVACY_ROWS.map(row => <li key={row.key}><Icon name={row.icon} /><div><h3>{t(`landing.privacy.${row.key}.title`)}</h3><p>{t(`landing.privacy.${row.key}.body`)}</p></div></li>)}</ul><Link to="/xu-ly-du-lieu" className="cn-landing-text-link">{t('landing.privacy.link')}<Icon name="arrow-right" /></Link></div></div>
    </section>
  )
}
