import { withBase } from '@/utils/url'
import Script from 'next/script'
import { developmentWorkerBootstrap } from '@/utils/development-service-worker'
import type { Metadata, Viewport } from 'next'
import type { ReactNode, CSSProperties } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '@/styles/index.css'
import { themeCssVars } from '@/styles/theme'
import { themeTokens } from '@/styles/tokens'
import { appConfig } from '@/config/app.config'
import { ToolsProviders } from '@/runtime/ToolsProviders'
import { ToolsRouter } from '@/runtime/ToolsRouter'

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: 'Chuyện Nhỏ — công cụ miễn phí',
  description: 'Công cụ PDF, hình ảnh, mã QR và tiện ích miễn phí. Xử lý trên máy bạn, tệp không tải lên.',
  icons: { icon: withBase('/brand/chuyen-nho-mark-v1.png'), apple: withBase('/icons/apple-touch-icon.png') },
  // iOS đời cũ không đọc manifest; tên ngắn và chế độ toàn màn hình khi "Thêm vào MH chính" lấy từ đây.
  appleWebApp: { capable: true, title: 'Chuyện Nhỏ', statusBarStyle: 'default' },
}
export const viewport: Viewport = { themeColor: '#005be8' }
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi" data-theme="light" data-bs-theme="light" suppressHydrationWarning style={themeCssVars(themeTokens.light) as CSSProperties}>
    <head>{process.env.NODE_ENV === 'development' && <Script id="doctools-development-worker" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: developmentWorkerBootstrap() }} />}</head>
    <body><ToolsProviders><ToolsRouter />{children}</ToolsProviders></body>
  </html>
}
