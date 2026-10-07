import { describe, expect, it } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import { VI_TOOL_CATALOG } from '@/features/tools/hub/utils/tool-catalog.fixture'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { getServerT } from '@/i18n/server'
import guidesText from '@/i18n/messages/vi/guides.json'
import legalText from '@/i18n/messages/vi/legal.json'
import site from '@/i18n/messages/vi/site.json'
import { GUIDE_GROUPS, GUIDES } from '../config/guides'
import { LEGAL_DOCUMENTS } from '../config/legal'
import { SITE_PAGE_SLUGS } from '../config/site-pages'
import { DATA_FAQ_IDS, FAQ_ITEMS } from '../config/support-faq'
import { filterProcessingRows, processingRows } from './data-processing'
import { faqJsonLd, localizeFaq, pickFaq, searchFaq } from './faq'

const TOOL_SLUGS = new Set(ALL_TOOLS.map((tool) => tool.slug))
const unique = (values: readonly string[]) => new Set(values).size === values.length
const FAQ = localizeFaq(await getServerT('vi', 'site'), FAQ_ITEMS)
const internalLinkExists = (to: string) => {
  const path = to.split('?')[0].replace(/^\//, '')
  return path === '' || SITE_PAGE_SLUGS.includes(path) || TOOL_SLUGS.has(path)
}

describe('site copy', () => {
  it('writes no em or en dash', () => {
    expect(JSON.stringify([site.faq, site.pages, guidesText, legalText])).not.toMatch(/[–—]/)
  })

  it('links only to pages and tools that exist', () => {
    const links = [...FAQ_ITEMS.flatMap((item) => item.link ?? []), ...Object.values(LEGAL_DOCUMENTS).flatMap((doc) => doc.sections.flatMap((section) => section.link ?? []))]
    expect(links.filter((link) => !internalLinkExists(link.to))).toEqual([])
  })
})

describe('FAQ', () => {
  it('has unique ids and every data-page id exists', () => {
    expect(unique(FAQ_ITEMS.map((item) => item.id))).toBe(true)
    expect(pickFaq(FAQ_ITEMS, DATA_FAQ_IDS)).toHaveLength(DATA_FAQ_IDS.length)
  })

  it('searches without diacritics across question and answer', () => {
    expect(searchFaq(FAQ, 'tai khoan').map((item) => item.id)).toContain('tai-khoan')
    expect(searchFaq(FAQ, '')).toHaveLength(FAQ_ITEMS.length)
    expect(searchFaq(FAQ, 'khongcotunay')).toEqual([])
    expect(FAQ.find((item) => item.id === 'loi')?.answer).toContain('contact@lpc.vn')
  })

  it('escapes markup in JSON-LD', () => {
    const json = faqJsonLd([{ id: 'x', question: '</script>', answer: 'a' }])
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json).mainEntity[0].name).toBe('</script>')
  })
})

describe('guides', () => {
  it('have unique slugs and point at tools that exist', () => {
    expect(unique(GUIDES.map((guide) => guide.slug))).toBe(true)
    const ids = new Set(ALL_TOOLS.map((tool) => tool.id))
    expect(GUIDES.flatMap((guide) => guide.toolIds).filter((id) => !ids.has(id))).toEqual([])
  })

  it('only use declared groups and have steps', () => {
    const groups = new Set(GUIDE_GROUPS.map((group) => group.id))
    for (const guide of GUIDES) {
      expect(groups.has(guide.group)).toBe(true)
      expect(guide.steps.length).toBeGreaterThan(0)
    }
  })

  it('have text for every step, tip and note id', () => {
    expect(Object.keys(guidesText.groups)).toEqual(GUIDE_GROUPS.map((group) => group.id))
    for (const guide of GUIDES) {
      const text = guidesText.items[guide.slug]
      expect(Object.keys(text.steps), guide.slug).toEqual([...guide.steps])
      expect(Object.keys(text.tips), guide.slug).toEqual([...guide.tips])
      expect(Object.keys(text.notes), guide.slug).toEqual([...guide.notes])
    }
  })
})

describe('legal documents', () => {
  it('have unique section ids for the table of contents', () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) expect(unique(doc.sections.map((section) => section.id))).toBe(true)
  })

  it('have text for every summary, paragraph, item and link id', () => {
    for (const [slug, doc] of Object.entries(LEGAL_DOCUMENTS)) {
      const text = legalText[slug as keyof typeof LEGAL_DOCUMENTS]
      expect(Object.keys(text.summary)).toEqual([...doc.summary])
      expect(Object.keys(text.sections)).toEqual(doc.sections.map((section) => section.id))
      for (const section of doc.sections) {
        const sectionText: { paragraphs?: object; items?: object; link?: string } = text.sections[section.id as keyof typeof text.sections]
        expect(Object.keys(sectionText.paragraphs ?? {}), section.id).toEqual([...section.paragraphs ?? []])
        expect(Object.keys(sectionText.items ?? {}), section.id).toEqual([...section.items ?? []])
        expect(Boolean(sectionText.link), section.id).toBe(Boolean(section.link))
      }
    }
  })
})

describe('processingRows', () => {
  const tool = (id: string, extra: Partial<ToolDefinition>): ToolDefinition =>
    ({ id, slug: id, name: id, description: '', pageTitle: id, synonyms: [], icon: 'x', categories: ['document'], status: 'ready', screen: 'quick-note', ...extra }) as ToolDefinition
  const labels = new Map([['document', 'Tài liệu']])

  it('maps processing, prefers the catalog privacy note and keeps ready tools first', () => {
    const rows = processingRows([
      tool('soon', { status: 'soon', processing: 'server' } as Partial<ToolDefinition>),
      tool('ocr', { processing: 'browser-model' }),
      tool('voice', { privacyNote: 'Đi qua trình duyệt' }),
    ], labels)
    expect(rows.map((row) => [row.tool.id, row.mode])).toEqual([['ocr', 'model'], ['voice', 'device'], ['soon', 'server']])
    expect(rows[1].note).toBe('Đi qua trình duyệt')
    expect(rows[0].note).toBeUndefined()
    expect(rows[0].defaultNote).toBe('model')
    expect(rows[0].group).toBe('Tài liệu')
    expect(filterProcessingRows(rows, 'server', '')).toHaveLength(1)
    expect(filterProcessingRows(rows, 'all', 'tai lieu')).toHaveLength(3)
  })

  it('never marks a ready tool as server-side', () => {
    const rows = processingRows(VI_TOOL_CATALOG, new Map())
    expect(rows.filter((row) => row.mode === 'server' && row.tool.status === 'ready')).toEqual([])
  })
})
