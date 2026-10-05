import { describe, expect, it } from 'vitest'
import { LEGACY_TOOL_QUERY, TOOL_CATALOG, TOOL_FILTERS } from '../config/tool-catalog'
import { filterTools, leavesToolScreen, legacyToolPath, resolveToolRoute, toolNeedsFullWidth, toolPageTitle, toolPath, toolPathOf } from './tool-lookup'

describe('TOOL_CATALOG', () => {
  it('gives every tool its own id and slug', () => {
    expect(new Set(TOOL_CATALOG.map((tool) => tool.id)).size).toBe(TOOL_CATALOG.length)
    expect(new Set(TOOL_CATALOG.map((tool) => tool.slug)).size).toBe(TOOL_CATALOG.length)
  })

  it('keeps slugs lowercase ASCII so a typed URL matches', () => {
    for (const tool of TOOL_CATALOG) expect(tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('keeps the four slugs already shared outside', () => {
    for (const slug of ['ghep-pdf', 'tach-pdf', 'anh-sang-pdf', 'pdf-sang-word']) {
      expect(resolveToolRoute(slug).tool?.slug).toBe(slug)
    }
  })

  it('leaves no filter chip without a tool', () => {
    for (const { value } of TOOL_FILTERS) expect(filterTools(TOOL_CATALOG, value, '').length).toBeGreaterThan(0)
  })

  it('shows the groups in a fixed order, starting with "all"', () => {
    expect(TOOL_FILTERS.map((item) => item.value)).toEqual(['all', 'document', 'image', 'calc', 'money', 'date', 'data', 'home', 'other'])
  })
})

describe('resolveToolRoute', () => {
  it('opens a ready tool and keeps a canonical URL as is', () => {
    expect(resolveToolRoute('ghep-pdf')).toMatchObject({ tool: { id: 'merge-pdf' }, redirect: null })
  })

  it('normalises a slug typed with capitals', () => {
    expect(resolveToolRoute('Tach-PDF')).toMatchObject({ tool: { id: 'split-pdf' }, redirect: 'tach-pdf' })
  })

  it('opens the tools that used to be "coming soon"', () => {
    expect(resolveToolRoute('so-sanh-tai-lieu')).toMatchObject({ tool: { id: 'compare', screen: 'compare-pdf' }, redirect: null })
    expect(resolveToolRoute('ky-tai-lieu')).toMatchObject({ tool: { id: 'sign', screen: 'sign-pdf' }, redirect: null })
  })

  it('sends an unknown slug back to the hub', () => {
    expect(resolveToolRoute('khong-co')).toEqual({ tool: null, redirect: null })
    expect(resolveToolRoute(undefined)).toEqual({ tool: null, redirect: null })
  })
})

describe('toolPath', () => {
  it('stays inside the branch it was built for', () => {
    expect(toolPath('/doc-tools', { slug: 'ghep-pdf' })).toBe('/doc-tools/ghep-pdf')
    expect(toolPath('/tools', { slug: 'ghep-pdf' })).toBe('/tools/ghep-pdf')
  })

  it('resolves a tool id, falling back to the hub of the same branch', () => {
    expect(toolPathOf('/tools', 'edit-pdf')).toBe('/tools/chinh-sua-pdf')
    expect(toolPathOf('/tools', 'qr-create')).toBe('/tools/tao-ma-qr')
    expect(toolPathOf('/tools', 'compare')).toBe('/tools/so-sanh-tai-lieu')
    expect(toolPathOf('/doc-tools', 'no-such-tool')).toBe('/doc-tools')
  })
})

describe('leavesToolScreen', () => {
  it('does not count a switch between two slugs of the same screen', () => {
    expect(leavesToolScreen('/doc-tools', '/doc-tools/chinh-sua-pdf', '/doc-tools/xem-pdf')).toBe(false)
    expect(leavesToolScreen('/tools', '/tools/xem-pdf', '/tools/chinh-sua-pdf/')).toBe(false)
  })

  it('counts another tool, the hub, another branch and any other screen as leaving', () => {
    expect(leavesToolScreen('/doc-tools', '/doc-tools/chinh-sua-pdf', '/doc-tools/ghep-pdf')).toBe(true)
    expect(leavesToolScreen('/doc-tools', '/doc-tools/chinh-sua-pdf', '/doc-tools')).toBe(true)
    expect(leavesToolScreen('/doc-tools', '/doc-tools/chinh-sua-pdf', '/tools/chinh-sua-pdf')).toBe(true)
    expect(leavesToolScreen('/tools', '/tools/chinh-sua-pdf', '/crm/customers')).toBe(true)
    expect(leavesToolScreen('/doc-tools', '/doc-tools/chinh-sua-pdf', '/login')).toBe(true)
  })
})

describe('toolNeedsFullWidth', () => {
  it('gives the whole width to both slugs of the PDF editor', () => {
    expect(toolNeedsFullWidth('chinh-sua-pdf')).toBe(true)
    expect(toolNeedsFullWidth('xem-pdf')).toBe(true)
  })

  it('keeps the hub, quick tools and unknown slugs beside the cover', () => {
    for (const slug of [undefined, 'ghep-pdf', 'tao-ma-qr', 'ky-tai-lieu', 'khong-co']) expect(toolNeedsFullWidth(slug)).toBe(false)
  })
})

describe('legacyToolPath', () => {
  it('moves old ?tool= links to the slug', () => {
    expect(legacyToolPath('/doc-tools', 'merge')).toBe('/doc-tools/ghep-pdf')
    expect(legacyToolPath('/doc-tools', ' PDF-to-Word ')).toBe('/doc-tools/pdf-sang-word')
  })

  it('sends an unknown value to the hub', () => {
    expect(legacyToolPath('/doc-tools', 'xyz')).toBe('/doc-tools')
  })

  it('only points at tools that open', () => {
    for (const slug of Object.values(LEGACY_TOOL_QUERY)) expect(resolveToolRoute(slug).tool).not.toBeNull()
  })
})

describe('filterTools', () => {
  it('filters by category', () => {
    const ids = filterTools(TOOL_CATALOG, 'calc', '').map((tool) => tool.id)
    expect(ids).toEqual(['study', 'measure-image', 'quick-calc', 'unit-convert'])
  })

  it('folds every PDF tool into the document group', () => {
    const ids = filterTools(TOOL_CATALOG, 'document', '').map((tool) => tool.id)
    for (const id of ['merge-pdf', 'split-pdf', 'compress-pdf', 'edit-pdf', 'view-pdf']) expect(ids).toContain(id)
  })

  it('matches without diacritics, every word anywhere in name, description or synonyms', () => {
    // "ghép ảnh" là từ đồng nghĩa của Scan ảnh → PDF.
    expect(filterTools(TOOL_CATALOG, 'all', 'ghep').map((tool) => tool.id)).toEqual(['collage', 'scan-to-pdf', 'merge-pdf'])
    expect(filterTools(TOOL_CATALOG, 'all', 'ghep pdf').map((tool) => tool.id)).toEqual(['scan-to-pdf', 'merge-pdf'])
    expect(filterTools(TOOL_CATALOG, 'all', 'pdf nen').map((tool) => tool.id)).toEqual(['compress-pdf'])
  })

  it('applies category and keyword together', () => {
    expect(filterTools(TOOL_CATALOG, 'image', 'nen').map((tool) => tool.id)).toEqual(['remove-background', 'compress-image'])
  })
})

describe('toolPageTitle', () => {
  it('keeps the titles the four shared links already had', () => {
    expect(toolPageTitle(resolveToolRoute('anh-sang-pdf').tool!)).toBe('Chuyển ảnh sang PDF miễn phí · Chuyện Nhỏ')
    expect(toolPageTitle(resolveToolRoute('ghep-pdf').tool!)).toBe('Ghép PDF miễn phí · Chuyện Nhỏ')
  })
})
