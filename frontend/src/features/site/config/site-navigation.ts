import { appConfig } from '@/config/app.config'

export const SITE_NAVIGATION = [
  { id: 'tools', to: '/cong-cu' },
  { id: 'construction', to: '/xay-dung' },
  { id: 'family', to: '/gia-dinh' },
  { id: 'guides', to: '/huong-dan' },
  { id: 'about', to: '/ve-chung-toi' },
] as const

export const FOOTER_LINKS = [
  { id: 'about', to: '/ve-chung-toi' },
  { id: 'guides', to: '/huong-dan' },
  { id: 'data', to: '/xu-ly-du-lieu' },
  { id: 'support', to: '/ho-tro' },
  { id: 'terms', to: '/dieu-khoan' },
  { id: 'privacy', to: '/quyen-rieng-tu' },
] as const

export const PRODUCT_LINKS = {
  erpcons: appConfig.erpconsUrl,
  tekshot: 'https://tekshot.vn',
} as const

export const SUPPORT_EMAIL = 'contact@lpc.vn'
