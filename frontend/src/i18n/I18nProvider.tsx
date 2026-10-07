'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { DEFAULT_LOCALE, type Locale } from './locales'
import { createI18n } from './instance'
import type { LocaleResources } from './resources'
import { setActiveI18n } from './runtime'

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function I18nProvider({ locale, resources, children }: { locale: Locale; resources: LocaleResources; children: ReactNode }) {
  const [instance] = useState(() => {
    const created = createI18n(locale, resources)
    if (typeof window !== 'undefined') setActiveI18n(created)
    return created
  })
  return <LocaleContext.Provider value={locale}><I18nextProvider i18n={instance}>{children}</I18nextProvider></LocaleContext.Provider>
}

/** Locale of the current page; fixed for the page's lifetime because switching language reloads. */
export function useLocale(): Locale {
  return useContext(LocaleContext)
}
