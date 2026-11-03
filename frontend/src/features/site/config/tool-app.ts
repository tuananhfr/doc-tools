import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales'
import { withBase } from '@/utils/url'

/**
 * Mỗi công cụ cài được thành một "ứng dụng" riêng trên màn hình chính: manifest riêng
 * (`/<lang>/<slug>/manifest.webmanifest`) và bộ icon riêng (`/app-icons/<slug>/<biến thể>-<phiên bản>.png`).
 * Cả hai đường dẫn có đuôi tệp nên `proxy.ts` để nguyên, không rewrite/redirect locale.
 */
export const TOOL_ICON_VARIANTS = {
  'icon-96': { size: 96, kind: 'any' },
  'icon-192': { size: 192, kind: 'any' },
  'icon-512': { size: 512, kind: 'any' },
  'maskable-512': { size: 512, kind: 'maskable' },
  'apple-180': { size: 180, kind: 'apple' },
} as const satisfies Record<string, { size: number; kind: 'any' | 'maskable' | 'apple' }>

export type ToolIconVariant = keyof typeof TOOL_ICON_VARIANTS

/** Đổi khi đổi cách vẽ hoặc hình công cụ: URL mới thì trình duyệt và máy đã cài mới lấy lại ảnh. */
export const TOOL_ICON_VERSION = '20261103'

export const isToolIconVariant = (value: string): value is ToolIconVariant => Object.hasOwn(TOOL_ICON_VARIANTS, value)

export const toolIconFile = (variant: ToolIconVariant) => `${variant}-${TOOL_ICON_VERSION}.png`

export const toolIconPath = (slug: string, variant: ToolIconVariant) => withBase(`/app-icons/${slug}/${toolIconFile(variant)}`)

/** Manifest của app chung "Chuyện Nhỏ": tiếng Việt giữ `/manifest.webmanifest` gốc, ngôn ngữ khác có bản riêng. */
export const siteManifestPath = (locale: Locale) => withBase(locale === DEFAULT_LOCALE ? '/manifest.webmanifest' : `/${locale}/manifest.webmanifest`)

/** Kể cả tiếng Việt cũng có tiền tố `/vi/`: `/<slug>/manifest.webmanifest` sẽ trúng route manifest theo locale. */
export const toolManifestPath = (slug: string, locale: Locale) => withBase(`/${locale}/${slug}/manifest.webmanifest`)
