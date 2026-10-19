import { describe, expect, it } from 'vitest'
import { generateMetadata as directoryMetadata } from '@/app/[lang]/page'
import { generateMetadata as landingMetadata } from '@/app/[lang]/gioi-thieu/page'
import sitemap from '@/app/sitemap'
import { getServerT } from '@/i18n/server'
import { localizePath } from '@/i18n/locales'
import { withBase } from '@/utils/url'
import { buildWebManifest } from './web-manifest'

describe('directory homepage and introduction URLs', () => {
  it.each(['vi', 'en', 'ar'] as const)('keeps metadata, sitemap and PWA entry consistent in %s', async lang => {
    const props = { params: Promise.resolve({ lang }) }
    const [directory, landing, t, manifest] = await Promise.all([
      directoryMetadata(props), landingMetadata(props), getServerT(lang, 'site'), buildWebManifest(lang),
    ])
    expect(directory.title).toBe(t('directory.metaTitle'))
    expect(directory.alternates?.canonical).toBe(withBase(localizePath('/', lang)))
    expect(landing.title).toBe(t('landing.metaTitle'))
    expect(landing.alternates?.canonical).toBe(withBase(localizePath('/gioi-thieu', lang)))
    expect(manifest.start_url).toBe(withBase(localizePath('/', lang)))
    const paths = sitemap().map(entry => new URL(entry.url).pathname)
    expect(paths).toContain(withBase(localizePath('/', lang)))
    expect(paths).toContain(withBase(localizePath('/gioi-thieu', lang)))
    expect(paths).not.toContain(withBase(localizePath('/cong-cu', lang)))
  })
})
