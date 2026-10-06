import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { SitePageHero } from '../components/SitePageHero'
import { LEGAL_DOCUMENTS, LEGAL_UPDATED, type LegalSlug } from '../config/legal'
import { SITE_PAGE_META } from '../config/site-pages'

export default function LegalPage({ slug }: { slug: LegalSlug }) {
  const doc = LEGAL_DOCUMENTS[slug]
  usePageTitle(SITE_PAGE_META[slug].title)
  const label = `${doc.title} ${doc.titleAccent}`

  return (
    <div className="cn-site-page cn-legal">
      <SitePageHero
        id="cn-legal-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: label.charAt(0).toUpperCase() + label.slice(1) }]}
        title={<>{doc.title} <span>{doc.titleAccent}</span></>}
        description={<><p>{doc.intro}</p><p className="cn-legal-updated"><Icon name="calendar3" />Cập nhật lần cuối: {LEGAL_UPDATED}</p></>}
      />

      <div className="cn-container cn-legal-body">
        <nav className="cn-legal-toc" aria-label="Mục lục">
          <h2>Mục lục</h2>
          <ol>{doc.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}</ol>
        </nav>
        <div className="cn-legal-content">
          <section className="cn-legal-summary" aria-labelledby="cn-legal-summary">
            <h2 id="cn-legal-summary">Tóm tắt</h2>
            <ul className="cn-hub-checks">{doc.summary.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
          </section>
          <ol className="cn-legal-sections">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <section id={section.id} aria-labelledby={`${section.id}-title`}>
                  <h2 id={`${section.id}-title`}>{section.heading}</h2>
                  {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
                  {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                  {section.link ? <Link className="cn-legal-link" to={section.link.to}>{section.link.label} <Icon name="arrow-right" /></Link> : null}
                </section>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
