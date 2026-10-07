import { withBase } from '@/utils/url'
import Script from 'next/script'
import { notFound } from 'next/navigation'
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
import { LOCALE_CODES, isLocale, localeInfo } from '@/i18n/locales'
import { BOOT_NAMESPACES, loadResources } from '@/i18n/resources'
import { getServerT, pageLocale } from '@/i18n/server'

type Props = { children: ReactNode; params: Promise<{ lang: string }> }

export const dynamicParams = false
export function generateStaticParams() { return LOCALE_CODES.map(lang => ({ lang })) }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const t = await getServerT(await pageLocale(params), 'site')
  return {
    metadataBase: new URL(appConfig.siteUrl),
    title: t('meta.title'),
    description: t('meta.description'),
    icons: { icon: withBase('/brand/chuyen-nho-mark-v1.png'), apple: withBase('/icons/apple-touch-icon.png') },
    // iOS đời cũ không đọc manifest; tên ngắn và chế độ toàn màn hình khi "Thêm vào MH chính" lấy từ đây.
    appleWebApp: { capable: true, title: 'Chuyện Nhỏ', statusBarStyle: 'default' },
  }
}
export const viewport: Viewport = { themeColor: '#005be8' }
export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const { tag, dir } = localeInfo(lang)
  const resources = await loadResources(lang, BOOT_NAMESPACES)
  return <html lang={tag} dir={dir} data-theme="light" data-bs-theme="light" suppressHydrationWarning style={themeCssVars(themeTokens.light) as CSSProperties}>
    <head>{process.env.NODE_ENV === 'development' && <Script id="doctools-development-worker" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: developmentWorkerBootstrap() }} />}</head>
    <body><ToolsProviders locale={lang} resources={resources}><ToolsRouter locale={lang} />{children}</ToolsProviders></body>
  </html>
}
