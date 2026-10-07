/**
 * Design token ERPcons - Crimson Ice FINAL v1.1
 * (ERPcons_Design_System.md, muc 03 / 04 / 12).
 *
 * Ba lop: primitive -> semantic -> component.
 * Component KHONG duoc viet hex truc tiep, moi mau phai di qua semantic token
 * (doc theo `useThemeTokens()` hoac bien CSS `--erp-*`).
 *
 * Tinh than mau v1.1:
 *   BLUE = Trust/Data/Control · TEAL = Intelligence · GREEN = Progress
 *   COPPER = Construction · CRIMSON = Identity/CTA · RED = Risk
 *
 * Ty le visual muc tieu: 74% Neutral/Ice · 12% Blue/Steel ·
 * 7% Teal-Green-Copper · 2% Crimson · <1% Danger (muc 01).
 */

export type ThemeMode = 'light' | 'dark' | 'field'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'field']

// Khoá i18n trong namespace `common`, dịch lúc vẽ.
export const THEME_LABEL = {
  light: 'theme.light',
  dark: 'theme.dark',
  field: 'theme.field',
} as const satisfies Record<ThemeMode, string>

/**
 * Nhãn HIỆN RA ở mọi chỗ chọn giao diện (menu header, màn đăng nhập, hàng chip
 * của màn Tôi) — một bộ chữ cho cả điện thoại lẫn máy tính. Nhãn đầy đủ
 * (`THEME_LABEL`) chỉ còn ở `title`/`aria-label`.
 */
export const THEME_SHORT_LABEL = {
  light: 'theme.lightShort',
  dark: 'theme.darkShort',
  field: 'theme.fieldShort',
} as const satisfies Record<ThemeMode, string>

/* -------------------------------------------------------------------------- */
/* Lop 1 - Primitive                                                          */
/* -------------------------------------------------------------------------- */

export const primitive = {
  brand: {
    crimson: '#DA3548',
    crimsonDeep: '#C9283E',
    crimsonBright: '#F04457',
  },
  foundation: {
    ink: '#101820',
    graphite: '#1B2633',
    steel: '#526477',
    mist: '#F2F6F8',
    snow: '#FFFFFF',
    cloud: '#E7EEF2',
  },
  domain: {
    teal: '#16A6A0',
    blue: '#3678D4',
    green: '#27A66F',
    copper: '#C98245',
  },
  semantic: {
    success: '#159A68',
    warning: '#C88920',
    danger: '#D9363E',
    info: '#3678D4',
    neutral: '#718096',
  },
} as const

/**
 * Thang mau mo rong theo poster 2027+ (muc 03).
 *
 * LUU Y: DOCX FINAL moi la source of truth cho `primitive` o tren. Cac bac duoi
 * day lay tu poster, dung cho surface/hover/soft-fill phu; `Ice 200` chua doc
 * duoc hex nen chua khai bao - can doi chieu Figma/token JSON truoc khi dung.
 */
export const scale = {
  ice: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F2F6F8',
    300: '#D2DEE7',
  },
  blue: {
    600: '#3678D4',
    500: '#1F6FE8',
  },
  steel: {
    600: '#334155',
  },
  grey: {
    600: '#64748B',
  },
  ink: {
    900: '#0F172A',
  },
  teal: {
    600: '#0D9488',
  },
  green: {
    600: '#16A34A',
    400: '#4ADE80',
  },
  copper: {
    500: '#F59E0B',
  },
} as const

/** Tao mau soft-fill tu mot hex primitive (badge, tile icon, hover...). */
export function alpha(hex: string, opacity: number): string {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const value = Number.parseInt(full, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/* -------------------------------------------------------------------------- */
/* Scale khong phu thuoc theme (muc 12)                                       */
/* -------------------------------------------------------------------------- */

/** Luoi 8px - core scale chot o v1.1: 4/8/12/16/24/32/48/64 (muc 09). */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const

/** Typography chot size co dinh o v1.1 (muc 09). */
export const fontSize = {
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 16,
  bodyLarge: 14,
  body: 14,
  caption: 12,
  overline: 10,
} as const

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 24,
  pill: 32,
} as const

export const layout = {
  headerHeight: 64,
  sidebarWidth: 248,
  sidebarCollapsedWidth: 76,
  contentMaxWidth: 1680,
  /** Touch target toi thieu (muc 16). */
  touchTarget: 44,
} as const

/** Breakpoint (muc 16). Mobile <=576, Tablet <=1024, Desktop <=1440, Large >1440. */
export const breakpoints = {
  mobile: 576,
  tablet: 1024,
  desktop: 1440,
} as const

export const mediaQuery = {
  /** Mobile: 1 cot, uu tien noi dung quan trong. */
  mobileDown: `(max-width: ${breakpoints.mobile}px)`,
  /** Mobile + Tablet: sidebar chuyen thanh Drawer. */
  tabletDown: `(max-width: ${breakpoints.tablet}px)`,
  /**
   * CHI tablet (577–1024px) — mode rieng, khong phai PC co nho hay dien thoai
   * phong to (tai lieu MASTER UI/Device/Offline muc 3). CSS dung dung cap so
   * nay: `@media (min-width: 577px) and (max-width: 1024px)`.
   */
  tabletOnly: `(min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.tablet}px)`,
  /**
   * TABLET NGANG — thiết bị CẢM ỨNG (không chuột) xoay ngang, rộng 900–1400px.
   * Không lấy theo `tabletOnly`: iPad 10.2" ngang rộng 1080px, iPad Air 1180px,
   * tablet Android 1280px — gần như mọi tablet thật xoay ngang đều vượt 1024px
   * nên bề ngang không phân biệt được tablet với laptop; `pointer: coarse` +
   * `hover: none` thì có. Dùng cho Master-Detail (pilot 03/10/2026).
   */
  tabletLandscape: '(orientation: landscape) and (hover: none) and (pointer: coarse) and (min-width: 900px) and (max-width: 1400px)',
} as const

export const fontFamily =
  "'Inter', 'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/* -------------------------------------------------------------------------- */
/* Lop 2 - Semantic                                                           */
/* -------------------------------------------------------------------------- */

export interface ChartTokens {
  planned: string
  actual: string
  forecast: string
  positive: string
  negative: string
  reference: string
  neutral: string
  grid: string
}

export interface SemanticTokens {
  /** Nen app */
  bg: string
  /** Card, panel, modal */
  surface: string
  /** Vung nhom, subsection */
  surfaceSecondary: string
  /** Hover row/item */
  surfaceHover: string

  textPrimary: string
  textSecondary: string
  textTertiary: string
  /** Chu tren nen dam (brand, hero) */
  textOnAccent: string

  border: string
  borderStrong: string

  /** action.primary - Crimson, chi dung cho Identity/CTA quan trong (~2%) */
  brand: string
  brandHover: string
  brandSoft: string

  /** action.secondary - Blue/Trust: link, hanh dong phu, du lieu (v1.1) */
  actionSecondary: string
  actionSecondaryHover: string
  actionSecondarySoft: string

  /** AI / automation - Teal (muc 08) */
  intelligence: string
  intelligenceSoft: string

  /** Construction reality - Copper: vat tu, thiet bi, hien truong */
  construction: string
  constructionSoft: string

  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  neutral: string
  neutralSoft: string

  focusRing: string

  /** Navigation & khung ung dung */
  sidebarBg: string
  headerBg: string
  heroFrom: string
  heroTo: string

  shadow1: string
  shadow2: string

  chart: ChartTokens
}

const lightTokens: SemanticTokens = {
  bg: primitive.foundation.mist,
  surface: primitive.foundation.snow,
  surfaceSecondary: primitive.foundation.cloud,
  surfaceHover: alpha(primitive.foundation.steel, 0.08),

  textPrimary: primitive.foundation.ink,
  textSecondary: '#344454',
  textTertiary: primitive.foundation.steel,
  textOnAccent: primitive.foundation.snow,

  border: '#D6E0E6',
  borderStrong: '#AAB7C2',

  brand: primitive.brand.crimson,
  brandHover: primitive.brand.crimsonDeep,
  brandSoft: alpha(primitive.brand.crimson, 0.1),

  actionSecondary: primitive.domain.blue,
  actionSecondaryHover: scale.blue[500],
  actionSecondarySoft: alpha(primitive.domain.blue, 0.12),

  intelligence: primitive.domain.teal,
  intelligenceSoft: alpha(primitive.domain.teal, 0.12),

  construction: primitive.domain.copper,
  constructionSoft: alpha(primitive.domain.copper, 0.14),

  success: primitive.semantic.success,
  successSoft: alpha(primitive.semantic.success, 0.12),
  warning: primitive.semantic.warning,
  warningSoft: alpha(primitive.semantic.warning, 0.14),
  danger: primitive.semantic.danger,
  dangerSoft: alpha(primitive.semantic.danger, 0.12),
  info: primitive.semantic.info,
  infoSoft: alpha(primitive.semantic.info, 0.12),
  neutral: primitive.semantic.neutral,
  neutralSoft: alpha(primitive.semantic.neutral, 0.12),

  focusRing: primitive.domain.blue,

  sidebarBg: primitive.foundation.snow,
  headerBg: primitive.foundation.snow,
  heroFrom: primitive.foundation.ink,
  heroTo: '#22303F',

  shadow1: '0 1px 2px rgba(16, 24, 32, 0.06)',
  shadow2: '0 2px 8px rgba(16, 24, 32, 0.08)',

  chart: {
    planned: primitive.domain.blue,
    actual: primitive.domain.teal,
    forecast: primitive.domain.copper,
    positive: primitive.domain.green,
    negative: primitive.semantic.danger,
    reference: primitive.foundation.steel,
    neutral: '#AAB7C2',
    grid: '#D6E0E6',
  },
}

const darkTokens: SemanticTokens = {
  bg: primitive.foundation.ink,
  surface: '#17232E',
  surfaceSecondary: '#202F3C',
  surfaceHover: alpha(primitive.foundation.snow, 0.07),

  textPrimary: primitive.foundation.mist,
  textSecondary: '#AEBBC6',
  textTertiary: '#8496A5',
  textOnAccent: primitive.foundation.snow,

  border: '#344554',
  borderStrong: '#46596B',

  brand: primitive.brand.crimsonBright,
  brandHover: '#FF6070',
  brandSoft: alpha(primitive.brand.crimsonBright, 0.18),

  actionSecondary: '#5EA8FF',
  actionSecondaryHover: '#84BEFF',
  actionSecondarySoft: alpha('#5EA8FF', 0.18),

  intelligence: '#21B8B0',
  intelligenceSoft: alpha('#21B8B0', 0.18),

  construction: '#D99A5E',
  constructionSoft: alpha('#D99A5E', 0.18),

  success: '#2DB87E',
  successSoft: alpha('#2DB87E', 0.18),
  warning: '#E0A030',
  warningSoft: alpha('#E0A030', 0.18),
  danger: '#F0575F',
  dangerSoft: alpha('#F0575F', 0.18),
  info: '#5EA8FF',
  infoSoft: alpha('#5EA8FF', 0.18),
  neutral: '#8496A5',
  neutralSoft: alpha('#8496A5', 0.18),

  focusRing: '#5EA8FF',

  sidebarBg: '#17232E',
  headerBg: '#17232E',
  heroFrom: '#1B2633',
  heroTo: '#27384A',

  shadow1: '0 1px 2px rgba(0, 0, 0, 0.32)',
  shadow2: '0 2px 8px rgba(0, 0, 0, 0.4)',

  chart: {
    planned: '#5EA8FF',
    actual: '#21B8B0',
    forecast: '#D99A5E',
    positive: '#2DB87E',
    negative: '#F0575F',
    reference: '#8496A5',
    neutral: '#5C6E7E',
    grid: '#344554',
  },
}

/**
 * Field Mode la theme rieng, khong phai Light tang do sang (muc 04).
 * v1.1 yeu cau contrast toi thieu 7:1 -> text phu dung #3C4C5C (~8.8:1 tren nen
 * trang) thay vi xam nhat.
 */
const fieldTokens: SemanticTokens = {
  bg: primitive.foundation.snow,
  surface: primitive.foundation.snow,
  surfaceSecondary: '#F3F5F6',
  surfaceHover: alpha(primitive.foundation.steel, 0.12),

  textPrimary: primitive.foundation.ink,
  textSecondary: '#344454',
  textTertiary: '#3C4C5C',
  textOnAccent: primitive.foundation.snow,

  border: '#AAB7C2',
  borderStrong: '#7F8F9C',

  brand: primitive.brand.crimsonDeep,
  brandHover: '#A81E31',
  brandSoft: alpha(primitive.brand.crimsonDeep, 0.12),

  actionSecondary: '#145CC2',
  actionSecondaryHover: '#0F4899',
  actionSecondarySoft: alpha('#145CC2', 0.12),

  intelligence: '#087F7A',
  intelligenceSoft: alpha('#087F7A', 0.14),

  construction: '#9A5A18',
  constructionSoft: alpha('#9A5A18', 0.14),

  success: '#087A50',
  successSoft: alpha('#087A50', 0.14),
  warning: '#9A6100',
  warningSoft: alpha('#9A6100', 0.14),
  danger: '#B51F2D',
  dangerSoft: alpha('#B51F2D', 0.12),
  info: '#145CC2',
  infoSoft: alpha('#145CC2', 0.12),
  neutral: '#3C4C5C',
  neutralSoft: alpha('#3C4C5C', 0.12),

  focusRing: '#145CC2',

  sidebarBg: primitive.foundation.snow,
  headerBg: primitive.foundation.snow,
  heroFrom: primitive.foundation.ink,
  heroTo: '#2B3B4B',

  shadow1: '0 1px 2px rgba(16, 24, 32, 0.12)',
  shadow2: '0 2px 8px rgba(16, 24, 32, 0.16)',

  chart: {
    planned: '#145CC2',
    actual: '#087F7A',
    forecast: '#9A5A18',
    positive: '#087A50',
    negative: '#B51F2D',
    reference: '#3C4C5C',
    neutral: '#7F8F9C',
    grid: '#AAB7C2',
  },
}

export const themeTokens: Record<ThemeMode, SemanticTokens> = {
  light: lightTokens,
  dark: darkTokens,
  field: fieldTokens,
}
