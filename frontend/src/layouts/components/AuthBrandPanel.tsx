import type { CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/common'
import { Icon } from '@/components/ui'
import { useThemeMode, useThemeTokens } from '@/hooks/useThemeTokens'
import { appConfig } from '@/config/app.config'
import { alpha } from '@/styles/tokens'

type Tone = 'trust' | 'intelligence' | 'progress' | 'construction'

interface BrandFeature {
  id: 'security' | 'connectivity' | 'singleSource' | 'performance' | 'analytics' | 'anywhere'
  icon: string
  tone: Tone
}

/**
 * 6 diem ban cua nen tang. Moi muc dung dung mot ngon ngu mau (muc 05):
 * Blue = tin cay/du lieu, Teal = tri tue, Green = tien do, Copper = xay dung.
 */
const FEATURES: BrandFeature[] = [
  {
    id: 'security',
    icon: 'shield-check',
    tone: 'trust',
  },
  {
    id: 'connectivity',
    icon: 'diagram-3',
    tone: 'intelligence',
  },
  {
    id: 'singleSource',
    icon: 'database',
    tone: 'trust',
  },
  {
    id: 'performance',
    icon: 'lightning-charge',
    tone: 'construction',
  },
  {
    id: 'analytics',
    icon: 'graph-up-arrow',
    tone: 'progress',
  },
  {
    id: 'anywhere',
    icon: 'people',
    tone: 'intelligence',
  },
]

interface AuthBrandPanelProps {
  /** `p` khi trang da co `h1` rieng (khung khach cua Chuyen Nho) - mot trang chi mot `h1`. */
  headlineTag?: 'h1' | 'p'
  /**
   * Bien logo thanh lien ket ve trang nay. Trang dang nhap khong truyen (dang o
   * diem dau roi); cac trang cong khai dung chung cot nay thi truyen de khach co
   * duong quay ra.
   */
  homeTo?: string
}

/**
 * Cot nhan dien cua trang dang nhap (an tu <=1024px, muc 06).
 *
 * Ba theme dung chung component nay, chi khac token: Light/Dark chay tren nen
 * hero toi co anh cong trinh, Field Mode doi sang surface sang vi "khong dung
 * Dark duoi nang" (muc 14).
 */
export function AuthBrandPanel({ headlineTag: Headline = 'h1', homeTo }: AuthBrandPanelProps = {}) {
  const t = useThemeTokens()
  const { mode } = useThemeMode()
  const { t: tr } = useTranslation('common')

  const onDark = mode !== 'field'
  const titleColor = onDark ? t.textOnAccent : t.textPrimary
  const bodyColor = onDark ? alpha(t.textOnAccent, 0.78) : t.textSecondary
  const captionColor = onDark ? alpha(t.textOnAccent, 0.62) : t.textTertiary
  const tileBg = onDark ? alpha(t.textOnAccent, 0.08) : t.surfaceSecondary
  const hairline = onDark ? alpha(t.textOnAccent, 0.14) : t.border
  const gridLine = onDark ? alpha(t.textOnAccent, 0.14) : alpha(t.textTertiary, 0.12)

  const toneColor: Record<Tone, string> = {
    trust: onDark ? t.info : t.actionSecondary,
    intelligence: t.intelligence,
    progress: t.success,
    construction: t.construction,
  }

  /**
   * Field Mode khong dung anh nen toi (muc 14), nen chi Light/Dark moi phu anh
   * cong trinh. Hai lop scrim giu chu >= 4.5:1 du anh sang toi the nao.
   */
  const photo = onDark ? appConfig.authBackground : ''
  const scrim = [
    // Ngang: dam ben trai de khoi chu luon doc duoc.
    `linear-gradient(105deg, ${alpha(t.heroFrom, 0.92)} 0%, ${alpha(t.heroFrom, 0.7)} 48%, ${alpha(t.heroFrom, 0.5)} 100%)`,
    // Doc: chan vung nang/kinh sang o day anh (vung dat 6 the tinh nang).
    `linear-gradient(180deg, ${alpha(t.heroFrom, 0.18)} 0%, ${alpha(t.heroFrom, 0.3)} 38%, ${alpha(t.heroFrom, 0.84)} 100%)`,
  ].join(', ')

  const panelStyle: CSSProperties & Record<'--erp-auth-grid-line', string> = {
    backgroundColor: onDark ? t.heroFrom : t.surfaceSecondary,
    // Lop cuoi la gradient hero: van dep neu file anh chua duoc dat vao public/.
    backgroundImage: onDark
      ? [
          scrim,
          photo ? `url(${photo})` : null,
          `linear-gradient(155deg, ${t.heroFrom} 0%, ${t.heroTo} 100%)`,
        ]
          .filter(Boolean)
          .join(', ')
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderInlineEnd: onDark ? undefined : `1px solid ${t.border}`,
    '--erp-auth-grid-line': gridLine,
  }

  return (
    <aside className="erp-auth__brand" style={panelStyle}>
      {/* Luoi blueprint chi thay the anh khi chua cau hinh file nen. */}
      {photo ? null : <div className="erp-auth__brand-grid" aria-hidden />}

      {homeTo ? (
        <Link to={homeTo} className="erp-auth__brand-home" aria-label={tr('authBrand.home', { name: appConfig.name })}>
          <BrandLogo size={48} inverse={onDark} />
        </Link>
      ) : (
        <BrandLogo size={48} inverse={onDark} />
      )}

      <div className="flex-grow-1 d-flex flex-column justify-content-center gap-4">
        <div>
          <Headline className="erp-auth__headline" style={{ color: titleColor }}>
            <Trans ns="common" i18nKey="authBrand.headline" components={{ br: <br /> }} />
          </Headline>

          <p className="erp-auth__lead" style={{ color: bodyColor }}>
            {tr('authBrand.lead', { name: appConfig.name })}
          </p>

          {/* Vach Crimson: dau nhan dien duy nhat tren panel (~2% visual). */}
          <div className="erp-auth__rule" />
        </div>

        <div className="erp-auth__features">
          {FEATURES.map((feature) => (
            <div key={feature.id} className="erp-auth__feature">
              <span
                className="erp-icon-tile erp-icon-tile--lg"
                style={{
                  background: tileBg,
                  border: `1px solid ${hairline}`,
                  color: toneColor[feature.tone],
                }}
              >
                <Icon name={feature.icon} />
              </span>

              <div>
                <div className="erp-auth__feature-title" style={{ color: titleColor }}>
                  {tr(`authBrand.features.${feature.id}.title`)}
                </div>
                {(['line1', 'line2'] as const).map((line) => (
                  <div key={line} className="erp-auth__feature-line" style={{ color: captionColor }}>
                    {tr(`authBrand.features.${feature.id}.${line}`)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trang thai he thong: icon + nhan + mau (khong bao gio chi dung mau, muc 05). */}
      <div className="erp-auth__status" style={{ borderTop: `1px solid ${hairline}` }}>
        <span className="d-inline-flex align-items-center gap-2" style={{ color: bodyColor }}>
          <Icon name="check-circle-fill" style={{ color: t.success }} />
          {tr('authBrand.status')}
        </span>

        <a
          href="#"
          className="d-none"
          target="_blank"
          rel="noreferrer"
          style={{ color: onDark ? t.info : t.actionSecondary }}
        >
          {tr('authBrand.statusLink')} <Icon name="arrow-right" size={10} />
        </a>
      </div>
    </aside>
  )
}
