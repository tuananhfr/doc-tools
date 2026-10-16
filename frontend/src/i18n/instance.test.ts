import { describe, expect, it } from 'vitest'
import { createI18n } from './instance'
import { LOCALE_CODES } from './locales'
import { BOOT_NAMESPACES, loadResources } from './resources'

describe.each(LOCALE_CODES)('createI18n(%s)', locale => {
  it('resolves boot messages and finishes loading a lazy namespace under its own code', async () => {
    const i18n = createI18n(locale, await loadResources(locale, BOOT_NAMESPACES))
    expect(i18n.languages).toEqual([locale])
    expect(i18n.t('common:language.label')).not.toBe('language.label')
    await i18n.loadNamespaces('rules')
    // A namespace that never leaves "pending" makes a suspended render retry forever.
    expect(i18n.hasLoadedNamespace('rules')).toBe(true)
  })
})

it('resolves the media and shared studio copy from lazy namespaces with key prefixes', async () => {
  const i18n = createI18n('vi', await loadResources('vi', BOOT_NAMESPACES))
  await i18n.loadNamespaces(['video', 'image'])

  expect(i18n.getFixedT('vi', 'video', 'mediaStudio')('trim.title')).toBe('Cắt video')
  expect(i18n.getFixedT('vi', 'video', 'mediaStudio.trim')('inputTitle')).toBe('1. Tải video lên')
  expect(i18n.getFixedT('vi', 'image', 'idPhotoStudio')('tools')).toBe('Công cụ')
})
