import { appConfig } from '@/config/app.config'

export const SITE_NAVIGATION = [
  { label: 'Công cụ', to: '/cong-cu' },
  { label: 'Xây dựng', to: '/xay-dung' },
  { label: 'Gia đình', to: '/gia-dinh' },
  { label: 'Hướng dẫn', to: '/huong-dan' },
  { label: 'Về chúng tôi', to: '/ve-chung-toi' },
] as const

export const FOOTER_LINKS = [
  { label: 'Giới thiệu', to: '/ve-chung-toi' },
  { label: 'Hướng dẫn', to: '/huong-dan' },
  { label: 'Xử lý dữ liệu', to: '/xu-ly-du-lieu' },
  { label: 'Hỗ trợ', to: '/ho-tro' },
  { label: 'Điều khoản', to: '/dieu-khoan' },
  { label: 'Quyền riêng tư', to: '/quyen-rieng-tu' },
] as const

export const PRODUCT_LINKS = {
  erpcons: appConfig.erpconsUrl,
  tekshot: 'https://tekshot.vn',
} as const

export const SUPPORT_EMAIL = 'contact@lpc.vn'
