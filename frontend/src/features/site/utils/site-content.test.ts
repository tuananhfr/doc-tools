import { describe, expect, it } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { GUIDE_GROUPS, GUIDES } from '../config/guides'
import { LEGAL_DOCUMENTS } from '../config/legal'
import { SITE_PAGE_META, SITE_PAGE_SLUGS } from '../config/site-pages'
import { DATA_FAQ_IDS, FAQ_ITEMS } from '../config/support-faq'
import { filterProcessingRows, processingRows } from './data-processing'
import { faqJsonLd, pickFaq, searchFaq } from './faq'

const TOOL_SLUGS = new Set(ALL_TOOLS.map((tool) => tool.slug))
const unique = (values: readonly string[]) => new Set(values).size === values.length
const internalLinkExists = (to: string) => {
  const path = to.split('?')[0].replace(/^\//, '')
  return path === '' || SITE_PAGE_SLUGS.includes(path) || TOOL_SLUGS.has(path)
}

describe('site copy', () => {
  it('writes no em or en dash', () => {
    expect(JSON.stringify([FAQ_ITEMS, GUIDES, GUIDE_GROUPS, LEGAL_DOCUMENTS, SITE_PAGE_META])).not.toMatch(/[–—]/)
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
    expect(searchFaq(FAQ_ITEMS, 'tai khoan').map((item) => item.id)).toContain('tai-khoan')
    expect(searchFaq(FAQ_ITEMS, '')).toHaveLength(FAQ_ITEMS.length)
    expect(searchFaq(FAQ_ITEMS, 'khongcotunay')).toEqual([])
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
})

describe('legal documents', () => {
  it('have unique section ids for the table of contents', () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) expect(unique(doc.sections.map((section) => section.id))).toBe(true)
  })
})

describe('processingRows', () => {
  const tool = (id: string, extra: Partial<ToolDefinition>): ToolDefinition =>
    ({ id, slug: id, name: id, description: '', icon: 'x', categories: ['document'], status: 'ready', screen: 'quick-note', ...extra }) as ToolDefinition
  const labels = new Map([['document', 'Tài liệu']])

  it('maps processing, prefers the catalog privacy note and keeps ready tools first', () => {
    const rows = processingRows([
      tool('soon', { status: 'soon', processing: 'server' } as Partial<ToolDefinition>),
      tool('ocr', { processing: 'browser-model' }),
      tool('voice', { privacyNote: 'Đi qua trình duyệt' }),
    ], labels)
    expect(rows.map((row) => [row.tool.id, row.mode])).toEqual([['ocr', 'model'], ['voice', 'device'], ['soon', 'server']])
    expect(rows[1].note).toBe('Đi qua trình duyệt')
    expect(rows[0].group).toBe('Tài liệu')
    expect(filterProcessingRows(rows, 'server', '')).toHaveLength(1)
    expect(filterProcessingRows(rows, 'all', 'tai lieu')).toHaveLength(3)
  })

  it('never marks a ready tool as server-side', () => {
    const rows = processingRows(ALL_TOOLS, new Map())
    expect(rows.filter((row) => row.mode === 'server' && row.tool.status === 'ready')).toEqual([])
  })
})
