import type { HubPageSlug } from '../types/hub-page.types'

export const SITE_NAVIGATION = [
  { id: 'tools', to: '/' },
  { id: 'guides', to: '/huong-dan' },
  { id: 'about', to: '/ve-chung-toi' },
] as const

/**
 * Nhóm công cụ theo thứ tự spec v3 §02. Header desktop đã chật nên không thêm vào `SITE_NAVIGATION`;
 * nhóm hiện ở menu trượt, menu trang chủ và hàng "Nhóm công cụ" của `/`.
 */
export const HUB_NAVIGATION: readonly HubPageSlug[] = ['tai-lieu-pdf', 'hinh-anh', 'mau-giay-to', 'ma-qr', 'doc-va-nghe', 'tinh-toan', 'kham-pha-giai-tri', 'gia-dinh']

/** Category menus open the same directory filters instead of separate landing pages. */
export const hubDirectoryPath = (slug: HubPageSlug) => `/?nhom=${slug}`

export const FOOTER_LINKS = [
  { id: 'suggest', to: '/de-xuat-tien-ich' },
  { id: 'feedback', to: '/gop-y-quy-dinh' },
  { id: 'about', to: '/ve-chung-toi' },
  { id: 'guides', to: '/huong-dan' },
  { id: 'data', to: '/xu-ly-du-lieu' },
  { id: 'support', to: '/ho-tro' },
  { id: 'terms', to: '/dieu-khoan' },
  { id: 'privacy', to: '/quyen-rieng-tu' },
] as const

export const PRODUCT_LINKS = {
  erpcons: 'https://erpcons.vn',
  tekshot: 'https://tekshot.vn',
} as const

export const SUPPORT_EMAIL = 'contact@lpc.vn'
