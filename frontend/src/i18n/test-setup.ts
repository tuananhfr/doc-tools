import fs from 'node:fs'
import path from 'node:path'
import { createInstance } from 'i18next'
import { registerFormatters } from './intl'
import { DEFAULT_LOCALE } from './locales'
import { NAMESPACES } from './resources'
import { setActiveI18n } from './runtime'

// Pure-logic tests call services that translate through `translate()`; give them the Vietnamese source strings.
const resources = Object.fromEntries(NAMESPACES.map(namespace => [namespace, JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'messages', DEFAULT_LOCALE, namespace + '.json'), 'utf8'))]))
const instance = createInstance()
void instance.init({ lng: DEFAULT_LOCALE, fallbackLng: false, ns: [...NAMESPACES], defaultNS: 'common', resources: { [DEFAULT_LOCALE]: resources }, initAsync: false, interpolation: { escapeValue: false } })
registerFormatters(instance)
setActiveI18n(instance)
