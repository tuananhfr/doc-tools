import { useIsMobile } from '@/hooks/useMediaQuery'
import { appConfig } from '@/config/app.config'
import logoFull from '@/assets/logo-full.png?url'
import logoMark from '@/assets/logo-mark.png?url'

/**
 * Lockup day du cao hon dau hieu don le thi phan chu moi doc duoc
 * (wordmark chi chiem ~1/3 chieu cao anh).
 */
const LOCKUP_SCALE = 1.28

/** Dao logo thanh trang de dung tren nen dam. */
const INVERSE_FILTER = 'brightness(0) invert(1)'

interface BrandLogoProps {
  /** Chieu cao (px) cua dau hieu; lockup day du duoc scale theo. */
  size?: number
  /** An phan chu khi sidebar thu gon. */
  showText?: boolean
  /** Dung tren nen dam (hero, trang dang nhap). */
  inverse?: boolean
  /**
   * Tren mobile chi giu dau hieu (dau nguoi + checklist), bo phan chu.
   * Dat `false` neu man hinh do CO du cho cho wordmark.
   */
  hideTextOnMobile?: boolean
}

interface BrandMarkProps {
  size?: number
  /** Dat `true` khi dung tren nen dam - logo se duoc dao thanh trang. */
  inverse?: boolean
  title?: string
}

/**
 * Dau hieu ERPcons: phan dau nguoi + checklist duoc cat rieng tu logo goc.
 */
export function BrandMark({ size = 36, inverse = false, title }: BrandMarkProps) {
  return (
    <img
      src={logoMark}
      alt={title ?? `${appConfig.name} logo`}
      draggable={false}
      style={{
        height: size,
        width: 'auto',
        flex: 'none',
        objectFit: 'contain',
        filter: inverse ? INVERSE_FILTER : undefined,
      }}
    />
  )
}

/**
 * Nhan dien ERPcons: dung truc tiep anh logo goc (dau hieu + wordmark).
 *
 * Tren mobile / sidebar thu gon chi con dau hieu (anh da cat san), tranh
 * viec nen anh full roi de wordmark bi bop met.
 */
export function BrandLogo({
  size = 36,
  showText = true,
  inverse = false,
  hideTextOnMobile = true,
}: BrandLogoProps) {
  const isMobile = useIsMobile()
  const withText = showText && !(hideTextOnMobile && isMobile)

  if (!withText) return <BrandMark size={size} inverse={inverse} />

  return (
    <img
      src={logoFull}
      alt={`${appConfig.name} - Construction OS`}
      draggable={false}
      style={{
        height: Math.round(size * LOCKUP_SCALE),
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        filter: inverse ? INVERSE_FILTER : undefined,
      }}
    />
  )
}
