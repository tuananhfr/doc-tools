import { describe, expect, it } from 'vitest'
import { TOOL_CATALOG } from '../config/tool-catalog'
import type { ToolDefinition } from '../types/tool.types'
import { filterTools } from './tool-lookup'
import { enabledTools, TOP_TOOL_COUNT, toolProcessing, topTools } from './tool-registry'

const tool = (id: string, extra: Partial<ToolDefinition> = {}): ToolDefinition =>
  ({ id, slug: id, name: id, description: '', icon: 'x', categories: ['other'], status: 'ready', screen: 'quick-note', ...extra }) as ToolDefinition

describe('enabledTools', () => {
  it('bỏ đúng công cụ bị tắt, id lạ thì không sao', () => {
    const catalog = [tool('a'), tool('b'), tool('c')]
    expect(enabledTools(catalog, ['b', 'khong-co']).map((item) => item.id)).toEqual(['a', 'c'])
    expect(enabledTools(catalog, [])).toBe(catalog)
  })
})

describe('topTools', () => {
  it('xếp theo priority, bỏ công cụ không có priority và công cụ "Sắp có"', () => {
    const catalog = [tool('a', { priority: 3 }), tool('b'), tool('c', { priority: 1 }), tool('d', { priority: 2, status: 'soon' } as Partial<ToolDefinition>)]
    expect(topTools(catalog).map((item) => item.id)).toEqual(['c', 'a'])
    expect(topTools(catalog, 1).map((item) => item.id)).toEqual(['c'])
  })
})

describe('danh mục thật', () => {
  it(`có đúng ${TOP_TOOL_COUNT} công cụ "Hay dùng", priority không trùng`, () => {
    const top = topTools(TOOL_CATALOG, 99)
    expect(top).toHaveLength(TOP_TOOL_COUNT)
    expect(new Set(top.map((item) => item.priority)).size).toBe(TOP_TOOL_COUNT)
  })

  it('công cụ chạy mô hình nhận dạng chữ được khai là browser-model', () => {
    const models = TOOL_CATALOG.filter((item) => toolProcessing(item) === 'browser-model').map((item) => item.id)
    expect(models.sort()).toEqual(['edit-pdf', 'image-to-text', 'ocr', 'view-pdf'])
  })

  it('tìm ra công cụ bằng từ người dùng hay gõ, không có trong tên lẫn mô tả', () => {
    const found = (keyword: string) => filterTools(TOOL_CATALOG, 'all', keyword).map((item) => item.id)
    expect(found('nối pdf')).toContain('merge-pdf')
    expect(found('giam dung luong')).toEqual(expect.arrayContaining(['compress-pdf', 'compress-image']))
    expect(found('docx')).toEqual(['convert-file'])
    expect(found('mã vạch')).toEqual(['barcode-create', 'qr-read', 'code-manager'])
    expect(found('mat khau')).toEqual(['pdf-password', 'random-code'])
  })
})
