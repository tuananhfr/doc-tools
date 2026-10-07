import type { i18n } from 'i18next'

let active: i18n | null = null

/** Called by `I18nProvider` in the browser only; tests install a Vietnamese instance in their setup file. */
export function setActiveI18n(instance: i18n): void {
  active = instance
}

/** Language of the active instance, or `null` on the server where there is none. */
export function peekActiveLanguage(): string | null {
  return active?.language ?? null
}

function requireActive(): i18n {
  // The server prerenders all locales in one process, so a shared instance there would mix languages.
  if (!active) throw new Error('translate() is browser-only: use useTranslation() in components rendered on the server')
  return active
}

/**
 * Translator for non-React tool code (services, utils, error messages). Safe
 * because tool screens never render on the server and a page keeps one locale
 * until the next full load. The namespace must already be loaded, which holds
 * when the tool's own screen calls `useTranslation(<namespace>)`.
 */
export const translate = ((...args: unknown[]) => (requireActive().t as unknown as (...rest: unknown[]) => string)(...args)) as unknown as i18n['t']

/**
 * `translate` for keys built from data ids or indexes (`terms.mountains.${index}`), which the typed
 * key union cannot follow. The parity test still guarantees every locale defines them.
 */
export const translateKey = translate as unknown as (key: string, options?: Record<string, unknown>) => string

/** Locale of the active page for `Intl` in non-React code; same browser-only rule as `translate`. */
export function activeLanguage(): string {
  return requireActive().language
}
