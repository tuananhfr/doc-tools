import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'

export function FamilyProductLink() {
  const { t } = useTranslation('site')
  return <section className="cn-family-product-link" aria-label={t('familyProduct.label')}>
    <Icon name="calendar-heart" /><div><p className="cn-family-product-label">{t('familyProduct.label')}</p><h2>{t('familyProduct.title')}</h2><p>{t('familyProduct.description')}</p></div>
    <Link className="cn-button" to="/lich-gia-dinh">{t('familyProduct.open')}<Icon name="arrow-right" /></Link>
  </section>
}
