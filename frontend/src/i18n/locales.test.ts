import { describe, expect, it } from 'vitest'
import { LOCALES, localizePath, splitLocalePath } from './locales'

describe('locale paths', () => {
  it('splits an explicit locale prefix', () => {
    expect(splitLocalePath('/en/cong-cu')).toEqual({ locale: 'en', rest: '/cong-cu', explicit: true })
    expect(splitLocalePath('/zh-hant')).toEqual({ locale: 'zh-hant', rest: '/', explicit: true })
    expect(splitLocalePath('/huong-dan/nen-pdf')).toEqual({ locale: 'vi', rest: '/huong-dan/nen-pdf', explicit: false })
    expect(splitLocalePath('/')).toEqual({ locale: 'vi', rest: '/', explicit: false })
  })

  it('leaves the default locale unprefixed', () => {
    expect(localizePath('/', 'vi')).toBe('/')
    expect(localizePath('/cong-cu', 'vi')).toBe('/cong-cu')
    expect(localizePath('/', 'ar')).toBe('/ar')
    expect(localizePath('/cong-cu', 'ja')).toBe('/ja/cong-cu')
  })

  it('never lets a locale code collide with a page slug', async () => {
    const { SITE_PAGE_SLUGS } = await import('@/features/site/config/site-pages')
    const { ALL_TOOLS } = await import('@/features/tools/hub/config/tool-list')
    const slugs = new Set([...SITE_PAGE_SLUGS, 'huong-dan', ...ALL_TOOLS.map(tool => tool.slug)])
    expect(LOCALES.filter(locale => slugs.has(locale.code))).toEqual([])
  })
})
