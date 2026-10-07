import Image from 'next/image'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'
import type { HubPage, HubPageText } from '../types/hub-page.types'
import { Breadcrumb } from './Breadcrumb'
import { MultilineText } from './MultilineText'

export function HubHero({ page, text }: { page: HubPage; text: HubPageText }) {
  const { t } = useTranslation('site')
  const titleId = `cn-hub-title-${page.slug}`

  return (
    <section className={`cn-hub-hero cn-hub-hero--${page.slug}`} aria-labelledby={titleId}>
      <div className="cn-container">
        <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('breadcrumb.tools'), to: '/cong-cu' }, { label: text.label }]} />
        <div className="cn-hub-hero-layout">
          <div className="cn-hub-hero-text">
            <h1 id={titleId}>
              <Trans ns="site" i18nKey={`hubs.${page.slug}.title`} components={{ accent: <span /> }} />
            </h1>
            <p className="cn-hub-tagline">{text.tagline}</p>
            <p className="cn-hub-description">{text.description}</p>
            <ul className="cn-hub-trust">
              {page.trust.map((item) => <li key={item.id}><Icon name={item.icon} /><span><strong>{text.trust[item.id].title}</strong>{text.trust[item.id].detail}</span></li>)}
            </ul>
          </div>
          <div className="cn-hub-art" aria-hidden="true">
            <p className="cn-sketch-caption"><MultilineText text={text.caption} /></p>
            {page.art.kind === 'image'
              ? <Image src={withBase(page.art.src)} width={page.art.width} height={page.art.height} sizes="(max-width: 1023px) 220px, 360px" alt="" preload />
              : <span className="cn-hub-art-icon"><Icon name={page.art.icon} /></span>}
          </div>
          <ul className="cn-hub-highlights" aria-label={t('hub.highlightsLabel')}>
            {page.highlights.map((item) => <li key={item}><Icon name="check2-square" />{text.highlights[item]}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}
