import { SITE_BRAND_MARK } from '../config/brand-assets'
import { withBase } from '@/utils/url'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function SiteBrand({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const { t } = useTranslation('site')
  return (
    <Link className={`cn-brand${compact ? ' cn-brand--compact' : ''}`} to="/" onClick={onClick} aria-label={t('brand.home')}>
      <Image src={withBase(SITE_BRAND_MARK)} width={48} height={48} alt="" loading="eager" />
      <span>Chuyện <span className="cn-brand-accent">Nhỏ</span></span>
    </Link>
  )
}
