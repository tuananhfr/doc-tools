import { withBase } from '@/utils/url'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { HERO_PROMISES } from '@/features/site/config/home-content'
import { MultilineText } from '@/features/site/components/MultilineText'
import { ToolSearch } from '@/features/site/components/ToolSearch'
import { HeroStats } from './HeroStats'

interface ToolsHeroProps {
  keyword: string
  onKeyword: (keyword: string) => void
  onSearch: () => void
}

export function ToolsHero({ keyword, onKeyword, onSearch }: ToolsHeroProps) {
  const { t } = useTranslation('site')
  return (
    <section className="cn-hero" aria-labelledby="erp-tools-hero-title">
      <div className="cn-container cn-hero-layout">
        <div className="cn-hero-art cn-hero-art--documents" aria-hidden="true">
          <p className="cn-sketch-caption"><MultilineText text={t('home.captionStart')} /></p>
          <Image src={withBase('/brand/documents-hero-v1.png')} width={1280} height={1280} sizes="(max-width: 767px) 124px, (max-width: 1023px) 170px, 300px" alt="" preload />
        </div>
        <div className="cn-hero-content">
          <h1 id="erp-tools-hero-title" className="cn-hero-wordmark">Chuyện <span>Nhỏ</span><span className="cn-wordmark-strokes" aria-hidden="true"><b /><b /><b /></span></h1>
          <p className="cn-hero-tagline">{t('home.tagline')}</p>
          <p className="cn-hero-description">{t('home.description')}</p>
          <ToolSearch qualityTracking id="cn-home-search" keyword={keyword} onKeyword={onKeyword} onSubmit={onSearch} />
          <ul className="cn-hero-promises" aria-label={t('home.promisesLabel')}>{HERO_PROMISES.map((promise) => <li key={promise}><Icon name="check-circle-fill" />{t(`home.promises.${promise}`)}</li>)}</ul>
        </div>
        <div className="cn-hero-art cn-hero-art--skyline">
          <div aria-hidden="true"><p className="cn-sketch-caption"><MultilineText text={t('home.captionEnd')} /></p><Image src={withBase('/brand/skyline-hero-v1.png')} width={1792} height={896} sizes="300px" alt="" /></div>
          <HeroStats />
        </div>
      </div>
    </section>
  )
}
