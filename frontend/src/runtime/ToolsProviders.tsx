'use client'
import { configureServiceWorker } from '@/utils/service-worker'
import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { ToastProvider } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { applyThemeMode } from '@/styles/theme'
dayjs.locale('vi')

export function ToolsProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, refetchOnWindowFocus: false, retry: false }, mutations: { retry: false } } }))
  const mode = useAppStore(state => state.theme)
  useEffect(() => applyThemeMode(mode), [mode])
  useEffect(() => {
    void configureServiceWorker().catch(error => console.warn('DocTools service worker setup failed', error))
  }, [])
  return <ToastProvider><QueryClientProvider client={client}>{children}</QueryClientProvider></ToastProvider>
}
