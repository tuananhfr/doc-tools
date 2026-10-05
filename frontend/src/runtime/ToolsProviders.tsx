'use client'
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
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])
  return <ToastProvider><QueryClientProvider client={client}>{children}</QueryClientProvider></ToastProvider>
}
