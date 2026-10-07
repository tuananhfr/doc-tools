'use client'
import { configureServiceWorker } from '@/utils/service-worker'
import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { ToastProvider } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { applyThemeMode } from '@/styles/theme'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { Locale } from '@/i18n/locales'
import type { LocaleResources } from '@/i18n/resources'
dayjs.locale('vi')

export function ToolsProviders({ locale, resources, children }: { locale: Locale; resources: LocaleResources; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false, retry: false }, mutations: { retry: false } } }))
  const mode = useAppStore(state => state.theme)
  useEffect(() => applyThemeMode(mode), [mode])
  useEffect(() => {
    void configureServiceWorker().catch(error => console.warn('DocTools service worker setup failed', error))
  }, [])
  return <I18nProvider locale={locale} resources={resources}><ToastProvider><QueryClientProvider client={client}>{children}</QueryClientProvider></ToastProvider></I18nProvider>
}
