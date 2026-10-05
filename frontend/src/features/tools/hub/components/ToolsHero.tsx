import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import { HERO_PROMISES } from '@/features/site/config/home-content'
import { ToolSearch } from '@/features/site/components/ToolSearch'
import { HeroStats } from './HeroStats'

interface ToolsHeroProps {
  keyword: string
  onKeyword: (keyword: string) => void
  onSearch: () => void
}

export function ToolsHero({ keyword, onKeyword, onSearch }: ToolsHeroProps) {
  return (
    <section className="cn-hero" aria-labelledby="erp-tools-hero-title">
      <div className="cn-container cn-hero-layout">
        <div className="cn-hero-art cn-hero-art--documents" aria-hidden="true">
          <p className="cn-sketch-caption">Những việc nhỏ<br />tạo nên giá trị lớn.</p>
          <Image src="/brand/documents-hero-v1.png" width={1280} height={1280} sizes="(max-width: 767px) 124px, (max-width: 1023px) 170px, 300px" alt="" preload />
        </div>
        <div className="cn-hero-content">
          <h1 id="erp-tools-hero-title" className="cn-hero-wordmark">Chuyện <span>Nhỏ</span><span className="cn-wordmark-strokes" aria-hidden="true"><b /><b /><b /></span></h1>
          <p className="cn-hero-tagline">Công cụ miễn phí. Cần là dùng.</p>
          <p className="cn-hero-description">Những tiện ích đơn giản, thiết thực cho công việc hằng ngày.</p>
          <ToolSearch id="cn-home-search" keyword={keyword} onKeyword={onKeyword} onSubmit={onSearch} />
          <ul className="cn-hero-promises" aria-label="Sử dụng ngay">{HERO_PROMISES.map((promise) => <li key={promise}><Icon name="check-circle-fill" />{promise}</li>)}</ul>
        </div>
        <div className="cn-hero-art cn-hero-art--skyline">
          <div aria-hidden="true"><p className="cn-sketch-caption">Đơn giản hôm nay.<br />Bền vững ngày mai.</p><Image src="/brand/skyline-hero-v1.png" width={1792} height={896} sizes="300px" alt="" /></div>
          <HeroStats />
        </div>
      </div>
    </section>
  )
}
