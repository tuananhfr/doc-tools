import { describe, expect, it } from 'vitest'
import { VI_TOOL_CATALOG } from '@/features/tools/hub/utils/tool-catalog.fixture'
import { HUB_NAVIGATION, SITE_NAVIGATION } from '../config/site-navigation'
import { DIRECTORY_GROUPS, directoryGroup, directoryGroupTools, directoryToolGroup } from './directory-groups'

describe('directory groups', () => {
  it('places every ready or upcoming tool in exactly one of the seven visible groups', () => {
    const grouped = HUB_NAVIGATION.flatMap(group => directoryGroupTools(VI_TOOL_CATALOG, group).map(tool => tool.id))
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(VI_TOOL_CATALOG.map(tool => tool.id).sort())
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'all')).toEqual(VI_TOOL_CATALOG)
    expect(DIRECTORY_GROUPS).not.toContain('other')
    expect(DIRECTORY_GROUPS).not.toContain('doc-va-nghe')
  })

  it('keeps the requested groups and removes duplicate placements', () => {
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'tai-lieu-pdf').some(tool => tool.id === 'edit-pdf')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'mau-giay-to').some(tool => tool.id === 'cv')).toBe(true)
    for (const id of ['office-word', 'office-sheet', 'office-slide', 'quick-calc', 'group-split']) {
      expect(VI_TOOL_CATALOG.some(tool => tool.id === id)).toBe(false)
      expect(directoryToolGroup(id)).toBeNull()
    }
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'hinh-anh').some(tool => tool.id === 'image-to-text')).toBe(true)
    expect(directoryGroupTools(VI_TOOL_CATALOG, 'tai-lieu-pdf').some(tool => tool.id === 'image-to-text')).toBe(false)
    expect(directoryToolGroup('image-to-text')).toBe('hinh-anh')
    expect(directoryToolGroup('number-words')).toBe('mau-giay-to')
    expect(directoryToolGroup('study')).toBe('tinh-toan')
    expect(directoryToolGroup('lunar-calendar')).toBe('gia-dinh')
  })

  it('moves reading, media and former Other tools without changing their availability', () => {
    for (const id of ['dictation', 'magnifier', 'read-aloud', 'address-conversion', 'payroll', 'pomodoro', 'invoice-xml', 'message-risk', 'quick-note', 'honor-board']) expect(directoryToolGroup(id)).toBe('gia-dinh')
    for (const id of ['compress-video', 'trim-video', 'video-gif', 'extract-audio', 'assistant']) expect(directoryToolGroup(id)).toBe('kham-pha-giai-tri')
    expect(directoryToolGroup('random-code')).toBe('ma-qr')
    expect(directoryToolGroup('unknown')).toBeNull()
  })

  it('accepts old shared category links and falls back safely for unknown groups', () => {
    expect(directoryGroup('construction')).toBe('all')
    expect(directoryGroup('xay-dung')).toBe('all')
    expect(directoryGroup('image')).toBe('hinh-anh')
    expect(directoryGroup('data')).toBe('ma-qr')
    expect(directoryGroup('tinh-toan')).toBe('tinh-toan')
    expect(directoryGroup('other')).toBe('all')
    expect(directoryGroup('tech')).toBe('all')
    expect(directoryGroup('doc-va-nghe')).toBe('gia-dinh')
    expect(directoryGroup('unknown')).toBe('all')
    expect(directoryGroup(null)).toBe('all')
  })

  it('hides migrated construction tools while retaining everyday image and compass tools', () => {
    expect(HUB_NAVIGATION).not.toContain('xay-dung')
    expect(SITE_NAVIGATION.some(item => item.to === '/xay-dung' as string)).toBe(false)
    for (const path of ['/gia-dinh', '/kham-pha-giai-tri']) expect(SITE_NAVIGATION.some(item => item.to === path)).toBe(false)
    const ids = VI_TOOL_CATALOG.map(tool => tool.id)
    for (const id of ['house-estimate', 'structure-calc', 'drawing-convert', 'drawing-area', 'site-diary', 'construction-price']) expect(ids).not.toContain(id)
    expect(ids).toContain('house-orientation')
    expect(ids).toContain('measure-image')
  })

  it('handles disabled or empty catalogs without adding phantom entries', () => {
    const reduced = VI_TOOL_CATALOG.filter(tool => tool.id !== 'edit-pdf')
    expect(directoryGroupTools(reduced, 'tai-lieu-pdf').some(tool => tool.id === 'edit-pdf')).toBe(false)
    expect(directoryGroupTools([], 'gia-dinh')).toEqual([])
  })
})
