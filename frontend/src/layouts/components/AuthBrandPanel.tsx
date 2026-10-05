import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/common'
import { Icon } from '@/components/ui'
import { useThemeMode, useThemeTokens } from '@/hooks/useThemeTokens'
import { appConfig } from '@/config/app.config'
import { alpha } from '@/styles/tokens'

type Tone = 'trust' | 'intelligence' | 'progress' | 'construction'

interface BrandFeature {
  icon: string
  title: string
  lines: [string, string]
  tone: Tone
}

/**
 * 6 diem ban cua nen tang. Moi muc dung dung mot ngon ngu mau (muc 05):
 * Blue = tin cay/du lieu, Teal = tri tue, Green = tien do, Copper = xay dung.
 */
const FEATURES: BrandFeature[] = [
  {
    icon: 'shield-check',
    title: 'Bảo mật tối đa',
    lines: ['ISO 27001 & SOC 2', 'Enterprise Grade'],
    tone: 'trust',
  },
  {
    icon: 'diagram-3',
    title: 'Kết nối toàn diện',
    lines: ['AI • IoT • OCR • API', 'Real-time Sync'],
    tone: 'intelligence',
  },
  {
    icon: 'database',
    title: 'Dữ liệu duy nhất',
    lines: ['One Object – One Source', 'of Truth'],
    tone: 'trust',
  },
  {
    icon: 'lightning-charge',
    title: 'Hiệu suất vượt trội',
    lines: ['Tối ưu tốc độ', 'và khả năng mở rộng'],
    tone: 'construction',
  },
  {
    icon: 'graph-up-arrow',
    title: 'Phân tích thông minh',
    lines: ['Dashboard trực quan', '& Insightful'],
    tone: 'progress',
  },
  {
    icon: 'people',
    title: 'Làm việc mọi nơi',
    lines: ['Web • Mobile • Offline', 'All-in-one Experience'],
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
        <Link to={homeTo} className="erp-auth__brand-home" aria-label={`Về trang chủ ${appConfig.name}`}>
          <BrandLogo size={48} inverse={onDark} />
        </Link>
      ) : (
        <BrandLogo size={48} inverse={onDark} />
      )}

      <div className="flex-grow-1 d-flex flex-column justify-content-center gap-4">
        <div>
          <Headline className="erp-auth__headline" style={{ color: titleColor }}>
            Một nền tảng
            <br />
            Mọi dự án
            <br />
            Kiểm soát hoàn toàn
          </Headline>

          <p className="erp-auth__lead" style={{ color: bodyColor }}>
            {appConfig.name} Construction OS – Nền tảng quản trị doanh nghiệp xây dựng toàn diện,
            tích hợp AI, IoT và dữ liệu thời gian thực để tối ưu hiệu suất, quản trị rủi ro và ra
            quyết định thông minh.
          </p>

          {/* Vach Crimson: dau nhan dien duy nhat tren panel (~2% visual). */}
          <div className="erp-auth__rule" />
        </div>

        <div className="erp-auth__features">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="erp-auth__feature">
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
                  {feature.title}
                </div>
                {feature.lines.map((line) => (
                  <div key={line} className="erp-auth__feature-line" style={{ color: captionColor }}>
                    {line}
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
          Tất cả hệ thống đang hoạt động bình thường
        </span>

        <a
          href="#"
          className="d-none"
          target="_blank"
          rel="noreferrer"
          style={{ color: onDark ? t.info : t.actionSecondary }}
        >
          Xem trạng thái hệ thống <Icon name="arrow-right" size={10} />
        </a>
      </div>
    </aside>
  )
}
