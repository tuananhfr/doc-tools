import { createInstance, type BackendModule, type i18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerFormatters } from './intl'
import { isLocale, type Locale } from './locales'
import { BASE_INIT_OPTIONS, BOOT_NAMESPACES, NAMESPACES, loadNamespace, type LocaleResources, type Namespace } from './resources'

const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    if (!isLocale(language) || !(NAMESPACES as readonly string[]).includes(namespace)) return callback(new Error(`Unknown i18n bundle ${language}/${namespace}`), false)
    loadNamespace(language, namespace as Namespace).then(messages => callback(null, messages), error => callback(error, false))
  },
}

/**
 * One instance per locale and per render root (never a module singleton): the
 * server prerenders many locales in the same process.
 */
export function createI18n(locale: Locale, resources: LocaleResources): i18n {
  const instance = createInstance()
  void instance.use(lazyBackend).use(initReactI18next).init({
    ...BASE_INIT_OPTIONS,
    lng: locale,
    ns: [...BOOT_NAMESPACES],
    defaultNS: 'common',
    resources: { [locale]: resources },
    partialBundledLanguages: true,
    // Synchronous init so the boot namespaces render on the first pass, server and client alike.
    initAsync: false,
    react: { useSuspense: true },
  })
  registerFormatters(instance)
  return instance
}
