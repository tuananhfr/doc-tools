import { withBase } from '@/utils/url'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function SiteBrand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('site')
  return (
    <Link className={`cn-brand${compact ? ' cn-brand--compact' : ''}`} to="/" aria-label={t('brand.home')}>
      <Image src={withBase('/brand/chuyen-nho-mark-v1.png')} width={48} height={48} alt="" loading="eager" />
      <span>Chuyện <span className="cn-brand-accent">Nhỏ</span></span>
    </Link>
  )
}
