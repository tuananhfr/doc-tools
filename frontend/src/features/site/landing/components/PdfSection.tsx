import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { PDF_TOOL_IDS } from '../config/landing-content'
import { ProductPreview } from './ProductPreview'

export function PdfSection() {
  const { t } = useTranslation('site')
  const catalog = useToolCatalog()
  const tools = PDF_TOOL_IDS.flatMap(id => catalog.filter(tool => tool.id === id && tool.status === 'ready'))
  return (
    <section className="cn-landing-pdf" aria-labelledby="cn-landing-pdf-title">
      <div className="cn-landing-container cn-landing-section cn-landing-pdf-inner">
        <ProductPreview kind="pdf" />
        <div><h2 id="cn-landing-pdf-title">{t('landing.pdf.title')}</h2><p className="cn-landing-body">{t('landing.pdf.body')}</p>
          <ul className="cn-landing-feature-rows">{tools.map(tool => <li key={tool.id}><Icon name={tool.icon} /><Link to={`/${tool.slug}`}><h3>{t(`landing.pdf.${tool.id === 'edit-pdf' ? 'edit' : tool.id === 'merge-pdf' ? 'merge' : 'split'}.title`)}</h3><p>{t(`landing.pdf.${tool.id === 'edit-pdf' ? 'edit' : tool.id === 'merge-pdf' ? 'merge' : 'split'}.body`)}</p></Link></li>)}</ul>
          <Link to="/tai-lieu-pdf" className="cn-landing-text-link">{t('landing.pdf.link')}<Icon name="arrow-right" /></Link>
        </div>
      </div>
    </section>
  )
}
