import type { InitOptions } from 'i18next'
import type { Locale } from './locales'

/** Every message namespace; each one is a JSON file per locale under `messages/<locale>/`. */
export const NAMESPACES = [
  'common', 'catalog', 'site', 'guides', 'legal', 'quality',
  'pdf', 'ocr', 'image', 'qr', 'utility', 'orientation', 'vietnam', 'finance', 'family', 'documents', 'video',
  'byoai', 'study', 'safety', 'construction', 'community', 'accessibility', 'rules', 'account',
] as const
export type Namespace = (typeof NAMESPACES)[number]

/**
 * Namespaces the server sends with every page so the shell hydrates without a
 * round trip; the rest load lazily when a screen first calls `useTranslation(ns)`.
 */
export const BOOT_NAMESPACES = ['common', 'catalog'] as const satisfies readonly Namespace[]

export type Messages = Record<string, unknown>
export type LocaleResources = Partial<Record<Namespace, Messages>>

export function loadNamespace(locale: Locale, namespace: Namespace): Promise<Messages> {
  // The chunk name carries locale + namespace so the offline manifest can skip other languages.
  return import(/* webpackChunkName: "i18n-[request]" */ `./messages/${locale}/${namespace}.json`).then(module => module.default as Messages)
}

export async function loadResources(locale: Locale, namespaces: readonly Namespace[]): Promise<LocaleResources> {
  const entries = await Promise.all(namespaces.map(async namespace => [namespace, await loadNamespace(locale, namespace)] as const))
  return Object.fromEntries(entries)
}

/**
 * Options shared by the browser and server instances. `zh-hans` would otherwise expand to
 * `zh-hans → zh-Hans → zh`; the extra codes never load, the namespace stays pending forever
 * and a suspended render retries in a tight loop (it hung the prerender).
 */
export const BASE_INIT_OPTIONS = {
  // Missing keys are caught by the parity test; falling back would load a second language.
  fallbackLng: false,
  load: 'currentOnly',
  lowerCaseLng: true,
  interpolation: { escapeValue: false },
} as const satisfies InitOptions
