import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'
import type { HubPage } from '../types/hub-page.types'
import { Breadcrumb } from './Breadcrumb'
import { MultilineText } from './MultilineText'

export function HubHero({ page }: { page: HubPage }) {
  const accentAt = page.title.indexOf(page.titleAccent)
  const titleId = `cn-hub-title-${page.slug}`

  return (
    <section className={`cn-hub-hero cn-hub-hero--${page.slug}`} aria-labelledby={titleId}>
      <div className="cn-container">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Công cụ', to: '/cong-cu' }, { label: page.label }]} />
        <div className="cn-hub-hero-layout">
          <div className="cn-hub-hero-text">
            <h1 id={titleId}>
              {page.title.slice(0, accentAt)}<span>{page.titleAccent}</span>{page.title.slice(accentAt + page.titleAccent.length)}
            </h1>
            <p className="cn-hub-tagline">{page.tagline}</p>
            <p className="cn-hub-description">{page.description}</p>
            <ul className="cn-hub-trust">
              {page.trust.map((item) => <li key={item.title}><Icon name={item.icon} /><span><strong>{item.title}</strong>{item.detail}</span></li>)}
            </ul>
          </div>
          <div className="cn-hub-art" aria-hidden="true">
            <p className="cn-sketch-caption"><MultilineText text={page.caption} /></p>
            {page.art.kind === 'image'
              ? <Image src={withBase(page.art.src)} width={page.art.width} height={page.art.height} sizes="(max-width: 1023px) 220px, 360px" alt="" preload />
              : <span className="cn-hub-art-icon"><Icon name={page.art.icon} /></span>}
          </div>
          <ul className="cn-hub-highlights" aria-label="Trong nhóm này">
            {page.highlights.map((item) => <li key={item}><Icon name="check2-square" />{item}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}
