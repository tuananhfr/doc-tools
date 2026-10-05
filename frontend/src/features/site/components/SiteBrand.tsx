import Image from 'next/image'
import { Link } from 'react-router-dom'

export function SiteBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`cn-brand${compact ? ' cn-brand--compact' : ''}`} to="/" aria-label="Chuyện Nhỏ, trang chủ">
      <Image src="/brand/chuyen-nho-mark-v1.png" width={48} height={48} alt="" loading="eager" />
      <span>Chuyện <span className="cn-brand-accent">Nhỏ</span></span>
    </Link>
  )
}
