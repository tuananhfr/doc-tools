import type { LandingMode } from '../types/landing.types'

/** Homepage artwork used for any picture slot staff left empty (files in `public/`). */
export const DEFAULT_PICTURES = {
  hero: '/landing/hero.webp',
  privacy: '/landing/privacy.webp',
  closing: '/landing/closing.webp',
  cases: ['/landing/documents.webp', '/landing/media.webp', '/landing/everyday.webp'],
  logo: '/brand/chuyen-nho-mark-v1.png',
} as const

export const defaultToolsShot = (mode: LandingMode) => mode === 'dark' ? '/landing/pdf-editor-dark.webp' : '/landing/pdf-editor-light.webp'

export const STEP_ICONS = ['search', 'file-earmark-plus', 'download'] as const
export const PRIVACY_ICONS = ['laptop', 'cloud', 'sliders'] as const

/** Header anchors; the ids are the sections' own. */
export const LANDING_ANCHORS = [
  { id: 'tien-ich', label: 'Tiện ích' },
  { id: 'cach-dung', label: 'Cách dùng' },
  { id: 'du-lieu', label: 'Quyền riêng tư' },
] as const

export const FOOTER_PAGES = [
  { path: '/cong-cu', label: 'Tất cả công cụ' },
  { path: '/dieu-khoan', label: 'Điều khoản' },
  { path: '/quyen-rieng-tu', label: 'Quyền riêng tư' },
  { path: '/xu-ly-du-lieu', label: 'Xử lý dữ liệu' },
] as const

/** Plain-text fallback for a page without a canonical address on its host site. */
export const BRAND_NAME = 'Chuyện Nhỏ'
