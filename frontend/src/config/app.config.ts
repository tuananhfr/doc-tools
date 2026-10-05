import { withBase } from '@/utils/url'

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'ERPCons',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'v2026.1.0',
  authBackground: withBase(process.env.NEXT_PUBLIC_AUTH_BACKGROUND ?? '/auth-background.jpg'),
  apiBaseUrl: withBase('/api/v1'),
  erpconsUrl: process.env.NEXT_PUBLIC_ERPCONS_URL ?? 'https://lpc.vn/erpcons',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002',
  docTools: process.env.NEXT_PUBLIC_DOC_TOOLS !== '0',
  toolsOff: (process.env.NEXT_PUBLIC_TOOLS_OFF ?? '').split(',').map(id => id.trim()).filter(Boolean),
  dateFormat: 'DD/MM/YYYY', dateTimeFormat: 'DD/MM/YYYY HH:mm', locale: 'vi-VN', currency: 'VND',
} as const
