import Image from 'next/image'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'
import { USE_CASES } from '../config/landing-content'

export function UseCasesSection() {
  const { t } = useTranslation('site')
  return (
    <section id="tien-ich" className="cn-landing-section cn-landing-container" aria-labelledby="cn-landing-cases-title">
      <div className="cn-landing-section-heading"><h2 id="cn-landing-cases-title">{t('landing.cases.title')}</h2><p>{t('landing.cases.body')}</p></div>
      <div className="cn-landing-cases">{USE_CASES.map(item => <article key={item.key}><Image src={withBase(`/landing/${item.image}`)} alt="" width={900} height={900} sizes="(max-width: 767px) 92vw, 30vw" /><h3>{t(`landing.cases.${item.key}.title`)}</h3><p>{t(`landing.cases.${item.key}.body`)}</p><Link to={item.to} className="cn-landing-text-link">{t('landing.cases.link')}<Icon name="arrow-right" /></Link></article>)}</div>
    </section>
  )
}
