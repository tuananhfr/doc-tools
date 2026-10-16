import { describe, expect, it } from 'vitest'
import { VI_TOOL_CATALOG } from '@/features/tools/hub/utils/tool-catalog.fixture'
import { HUB_NAVIGATION } from '../config/site-navigation'
import { directoryGroup, directoryGroupTools } from './directory-groups'

describe('directory groups', () => {
  it('keeps every catalog entry reachable through the nine groups or Other', () => {
    const grouped = new Set(HUB_NAVIGATION.flatMap(group => directoryGroupTools(VI_TOOL_CATALOG, group).map(tool => tool.id)))
    const other = directoryGroupTools(VI_TOOL_CATALOG, 'other').map(tool => tool.id)
    expect(other.every(id => !grouped.has(id))).toBe(true)
    expect([...new Set([...grouped, ...other])].sort()).toEqual(VI_TOOL_CATALOG.map(tool => tool.id).sort())
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'all')).toEqual(VI_TOOL_CATALOG)
  })

  it('uses the recognizable existing groups and permits a tool in multiple groups', () => {
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'tai-lieu-pdf').some(tool => tool.id === 'edit-pdf')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'mau-giay-to').some(tool => tool.id === 'cv')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'hinh-anh').some(tool => tool.id === 'image-to-text')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'tai-lieu-pdf').some(tool => tool.id === 'image-to-text')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'other').length).toBeGreaterThan(0)
  })

  it('accepts old shared category links and falls back safely for unknown groups', () => {
    expect(directoryGroup('image')).toBe('hinh-anh')
    expect(directoryGroup('data')).toBe('ma-qr')
    expect(directoryGroup('tinh-toan')).toBe('tinh-toan')
    expect(directoryGroup('other')).toBe('other')
    expect(directoryGroup('unknown')).toBe('all')
    expect(directoryGroup(null)).toBe('all')
  })

  it('handles disabled or empty catalogs without adding phantom entries', () => {
    const reduced = VI_TOOL_CATALOG.filter(tool => tool.id !== 'edit-pdf')
    expect(directoryGroupTools(reduced, 'tai-lieu-pdf').some(tool => tool.id === 'edit-pdf')).toBe(false)
    expect(directoryGroupTools([], 'other')).toEqual([])
  })
})
