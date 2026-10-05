import { appConfig } from '@/config/app.config'

export const SITE_NAVIGATION = [
  { label: 'Công cụ', to: '/cong-cu' },
  { label: 'Tài liệu', to: '/cong-cu?nhom=document' },
  { label: 'Nhà & đời sống', to: '/cong-cu?nhom=home' },
  { label: 'Về Chuyện Nhỏ', to: '/#ve-chuyen-nho' },
] as const

export const PRODUCT_LINKS = {
  erpcons: appConfig.erpconsUrl,
  tekshot: 'https://tekshot.vn',
} as const
