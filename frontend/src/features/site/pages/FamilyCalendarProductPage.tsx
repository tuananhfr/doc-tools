import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import FamilyCalendarPage from '@/features/tools/family/pages/FamilyCalendarPage'

export default function FamilyCalendarProductPage() {
  const { t } = useTranslation('site')
  usePageTitle(t('pages.lich-gia-dinh.title'))
  return <div className="erp-tool-page cn-tool-workspace cn-family-product">
    <nav className="erp-tool-crumb" aria-label={t('familyProduct.navigation')}>
      <Link className="erp-tool-crumb__back" to="/gia-dinh"><Icon name="arrow-left" />{t('familyProduct.back')}</Link>
    </nav>
    <header className="cn-tool-intro">
      <span className="cn-tool-intro__icon"><Icon name="calendar-heart" /></span>
      <div className="cn-tool-intro__text"><p className="cn-family-product-label">{t('familyProduct.label')}</p><h1 className="erp-tool-crumb__title">{t('familyProduct.title')}</h1><p className="cn-tool-description">{t('familyProduct.description')}</p></div>
    </header>
    <FamilyCalendarPage />
  </div>
}
