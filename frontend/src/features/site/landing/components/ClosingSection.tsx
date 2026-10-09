import Image from 'next/image'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'

export function ClosingSection() {
  const { t } = useTranslation('site')
  return (
    <section className="cn-landing-closing" aria-labelledby="cn-landing-closing-title">
      <Image src={withBase('/landing/closing.webp')} alt="" fill sizes="100vw" />
      <div className="cn-landing-closing-copy cn-landing-container"><h2 id="cn-landing-closing-title">{t('landing.closing.title')}</h2><p>{t('landing.closing.body')}</p><Link to="/cong-cu" className="cn-landing-button cn-landing-button--inverse">{t('landing.openTools')}<Icon name="arrow-right" /></Link></div>
    </section>
  )
}
