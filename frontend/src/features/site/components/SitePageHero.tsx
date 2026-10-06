import type { ReactNode } from 'react'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import { MultilineText } from './MultilineText'

interface SitePageHeroProps {
  id: string
  trail: readonly BreadcrumbItem[]
  title: ReactNode
  tagline?: string
  description?: ReactNode
  caption?: string
  /** Hình bên phải; trang nào chưa có ảnh vẽ thì truyền icon. */
  art?: ReactNode
  children?: ReactNode
}

export function SitePageHero({ id, trail, title, tagline, description, caption, art, children }: SitePageHeroProps) {
  return (
    <section className="cn-page-hero" aria-labelledby={id}>
      <div className="cn-container">
        <Breadcrumb items={trail} />
        <div className={`cn-page-hero-layout${art ? '' : ' is-text-only'}`}>
          <div className="cn-page-hero-text">
            <h1 id={id}>{title}</h1>
            {tagline ? <p className="cn-page-tagline">{tagline}</p> : null}
            {description ? <div className="cn-page-description">{description}</div> : null}
            {children}
          </div>
          {art ? (
            <div className="cn-page-hero-art" aria-hidden="true">
              {caption ? <p className="cn-sketch-caption"><MultilineText text={caption} /></p> : null}
              {art}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
