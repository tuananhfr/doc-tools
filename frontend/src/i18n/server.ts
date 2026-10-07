import { createInstance, type TFunction } from 'i18next'
import { withBase } from '@/utils/url'
import { DEFAULT_LOCALE, LOCALES, isLocale, localizePath, type Locale } from './locales'
import { registerFormatters } from './intl'
import { BASE_INIT_OPTIONS, loadResources, type Namespace } from './resources'

/** Props Next passes to pages and `generateMetadata` under `app/[lang]`. */
export type LangParams = { params: Promise<{ lang: string }> }

/** `[lang]` is validated by the root layout (`dynamicParams = false`); this only narrows the type. */
export async function pageLocale(params: LangParams['params']): Promise<Locale> {
  const { lang } = await params
  return isLocale(lang) ? lang : DEFAULT_LOCALE
}

/** Translator for server code (metadata, route handlers) where React context does not exist. */
export async function getServerT<N extends Namespace>(locale: Locale, namespace: N): Promise<TFunction<N>> {
  const instance = createInstance()
  await instance.init({
    ...BASE_INIT_OPTIONS,
    lng: locale,
    ns: [namespace],
    defaultNS: namespace,
    resources: { [locale]: await loadResources(locale, [namespace]) },
  })
  registerFormatters(instance)
  return instance.getFixedT(locale, namespace)
}

/** Canonical URL plus hreflang alternates for a locale-free path such as `/cong-cu`. */
export function localeAlternates(path: string, locale: Locale) {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map(item => [item.tag, withBase(localizePath(path, item.code))]))
  languages['x-default'] = withBase(localizePath(path, DEFAULT_LOCALE))
  return { canonical: withBase(localizePath(path, locale)), languages }
}
