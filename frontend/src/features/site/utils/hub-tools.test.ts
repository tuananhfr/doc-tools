import { describe, expect, it } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { HUB_PAGE_LIST } from '../config/hub-pages'
import { SITE_PAGE_SLUGS } from '../config/site-pages'
import type { HubPage } from '../types/hub-page.types'
import { readyFirst, resolveHubTools, searchHubTools } from './hub-tools'

const tool = (id: string, status: 'ready' | 'soon' = 'ready', name = id): ToolDefinition =>
  ({ id, slug: id, name, description: '', icon: 'x', categories: ['other'], status, ...(status === 'ready' ? { screen: 'quick-note' } : {}) }) as ToolDefinition

const page = (subgroups: HubPage['subgroups']): HubPage => ({ ...HUB_PAGE_LIST[0], subgroups })

describe('resolveHubTools', () => {
  it('puts ready tools first, drops duplicates and ids missing from the catalog', () => {
    const catalog = [tool('a'), tool('b', 'soon'), tool('c')]
    const hub = resolveHubTools(page([
      { id: 'one', label: 'One', toolIds: ['b', 'a', 'gone'] },
      { id: 'two', label: 'Two', toolIds: ['a', 'c'] },
    ]), catalog)
    expect(hub.groups.map((group) => group.tools.map((item) => item.id))).toEqual([['a', 'b'], ['a', 'c']])
    expect(hub.all.map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('hides a subgroup whose every tool is switched off', () => {
    const hub = resolveHubTools(page([{ id: 'off', label: 'Off', toolIds: ['gone'] }, { id: 'on', label: 'On', toolIds: ['a'] }]), [tool('a')])
    expect(hub.groups.map((group) => group.id)).toEqual(['on'])
  })
})

describe('searchHubTools', () => {
  const hub = resolveHubTools(page([
    { id: 'one', label: 'One', toolIds: ['a'] },
    { id: 'two', label: 'Two', toolIds: ['b'] },
  ]), [tool('a', 'ready', 'Nén PDF'), tool('b', 'ready', 'Ghép PDF')])

  it('searches inside the chosen subgroup, or the whole hub for an unknown one', () => {
    expect(searchHubTools(hub, 'two', '').map((item) => item.id)).toEqual(['b'])
    expect(searchHubTools(hub, 'all', 'nen').map((item) => item.id)).toEqual(['a'])
    expect(searchHubTools(hub, 'khong-co', 'pdf').map((item) => item.id)).toEqual(['a', 'b'])
  })
})

describe('readyFirst', () => {
  it('keeps declared order inside each status', () => {
    expect(readyFirst([tool('s1', 'soon'), tool('r1'), tool('s2', 'soon'), tool('r2')]).map((item) => item.id)).toEqual(['r1', 'r2', 's1', 's2'])
  })
})

describe('real hub pages', () => {
  it('only lists tool ids that exist', () => {
    const ids = new Set(ALL_TOOLS.map((item) => item.id))
    for (const hubPage of HUB_PAGE_LIST) {
      for (const group of hubPage.subgroups) for (const id of group.toolIds) expect(ids, `${hubPage.slug}/${group.id}`).toContain(id)
    }
  })

  it('spotlights only ready tools', () => {
    for (const hubPage of HUB_PAGE_LIST) {
      for (const aside of hubPage.aside) {
        if (aside.kind === 'spotlight') expect(ALL_TOOLS.find((item) => item.id === aside.toolId)?.status).toBe('ready')
      }
    }
  })

  it('keeps subgroup ids unique and the title accent inside the title', () => {
    for (const hubPage of HUB_PAGE_LIST) {
      expect(new Set(hubPage.subgroups.map((group) => group.id)).size).toBe(hubPage.subgroups.length)
      expect(hubPage.title).toContain(hubPage.titleAccent)
    }
  })

  it('writes no em or en dash in page copy', () => {
    expect(JSON.stringify(HUB_PAGE_LIST)).not.toMatch(/[–—]/)
  })
})

describe('SITE_PAGE_SLUGS', () => {
  it('never takes a tool slug', () => {
    const toolSlugs = new Set(ALL_TOOLS.map((item) => item.slug))
    for (const slug of SITE_PAGE_SLUGS) expect(toolSlugs.has(slug), slug).toBe(false)
    expect(new Set(SITE_PAGE_SLUGS).size).toBe(SITE_PAGE_SLUGS.length)
  })
})
