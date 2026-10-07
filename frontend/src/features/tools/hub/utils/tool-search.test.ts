import { describe, expect, it } from 'vitest'
import { SEARCH_INTENTS } from '../config/intent-registry'
import { SEARCH_STORIES } from '../config/search-stories'
import { VI_TOOL_CATALOG } from './tool-catalog.fixture'
import { searchTools } from './tool-search'

describe('search intent proposals', () => {
  it('passes table intent options without changing the shared catalog', () => {
    const result = searchTools(VI_TOOL_CATALOG, 'Ảnh bảng sang Excel')[0]
    expect(result.searchParams).toBe('ocrProfile=table&ocrOutput=xlsx')
    expect(VI_TOOL_CATALOG.find(tool => tool.id === result.id)?.searchParams).toBeUndefined()
    expect(searchTools(VI_TOOL_CATALOG, 'đọc chữ viết tay từ ảnh')).toEqual([])
  })
  it.each(SEARCH_STORIES)('$id: $query', story => {
    const results = searchTools(VI_TOOL_CATALOG, story.query)
    if (story.preferredTool) expect(results[0]?.id).toBe(story.preferredTool)
    else expect(results).toEqual([])
    expect(results.every(tool => tool.status === 'ready')).toBe(true)
    expect(results.some(tool => story.forbiddenTools.includes(tool.id))).toBe(false)
  })

  it('only references existing usable preferred tools', () => {
    expect(new Set(SEARCH_INTENTS.map(intent => intent.id)).size).toBe(SEARCH_INTENTS.length)
    for (const intent of SEARCH_INTENTS) {
      expect(VI_TOOL_CATALOG.find(tool => tool.id === intent.preferredTool)?.status).toBe('ready')
      expect(intent.forbiddenTools).not.toContain(intent.preferredTool)
    }
  })

  it('retains browsing order, including coming-soon cards', () => {
    expect(searchTools(VI_TOOL_CATALOG, '')).toEqual(VI_TOOL_CATALOG)
  })

  it('does not replace a disabled tool with an unrelated alternative', () => {
    expect(searchTools(VI_TOOL_CATALOG.filter(tool => tool.id !== 'compress-pdf'), 'file nặng quá không gửi được')).toEqual([])
  })

  it('treats decomposed Vietnamese and invisible characters consistently', () => {
    expect(searchTools(VI_TOOL_CATALOG, 'Nén PDF'.normalize('NFD'))[0]?.id).toBe('compress-pdf')
    expect(searchTools(VI_TOOL_CATALOG, 'ghép\u200b PDF')[0]?.id).toBe('merge-pdf')
  })

  it('supports localized catalog text without requiring Vietnamese aliases', () => {
    const catalog = [{ ...VI_TOOL_CATALOG.find(tool => tool.id === 'compress-pdf')!, name: 'Compress PDF', description: 'Reduce document size', synonyms: ['shrink PDF'] }]
    expect(searchTools(catalog, 'shrink PDF')[0]?.id).toBe('compress-pdf')
    expect(searchTools(catalog, 'comrpess PDF')[0]?.id).toBe('compress-pdf')
  })
})
