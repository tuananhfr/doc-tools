import { describe, expect, it } from 'vitest'
import type { Decorations } from '../types/decorations.types'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { DEFAULT_HEADER_FOOTER, DEFAULT_WATERMARK } from './decorations'
import { deletePages, rotatePages } from './page-ops'
import { initialWorkspace, workspaceReducer, type WorkspaceState } from './workspace-reducer'

function source(id: string, pageCount: number): SourceFile {
  return { id, name: `${id}.pdf`, kind: 'pdf', mime: 'application/pdf', bytes: new Uint8Array(), size: 0, pageCount }
}

function pagesOf(sourceId: string, count: number): PageRef[] {
  return Array.from({ length: count }, (_, index) => ({ id: `${sourceId}-${index + 1}`, sourceId, pageIndex: index, rotation: 0 }))
}

function withFile(id: string, count: number, state: WorkspaceState = initialWorkspace): WorkspaceState {
  return workspaceReducer(state, { type: 'add', sources: [source(id, count)], pages: pagesOf(id, count), anchorId: null, position: 'after' })
}

describe('workspaceReducer', () => {
  it('hoàn tác / làm lại một lần thêm tệp', () => {
    const added = withFile('a', 3)
    expect(added.pages).toHaveLength(3)

    const undone = workspaceReducer(added, { type: 'undo' })
    expect(undone.pages).toHaveLength(0)
    // Tệp nguồn vẫn giữ để làm lại.
    expect(undone.sources.a).toBeDefined()

    const redone = workspaceReducer(undone, { type: 'redo' })
    expect(redone.pages).toEqual(added.pages)
  })

  it('thao tác mới xoá nhánh làm lại', () => {
    const state = withFile('b', 1, workspaceReducer(withFile('a', 2), { type: 'undo' }))
    expect(state.future).toHaveLength(0)
  })

  it('xoá trang thì bỏ luôn khỏi danh sách đang chọn', () => {
    let state = withFile('a', 4)
    state = workspaceReducer(state, { type: 'select', id: 'a-2', mode: 'toggle' })
    state = workspaceReducer(state, { type: 'select', id: 'a-3', mode: 'toggle' })
    state = workspaceReducer(state, { type: 'edit', next: (pages) => deletePages(pages, ['a-2']) })
    expect(state.selected).toEqual(['a-3'])
  })

  it('Shift+bấm chọn cả dải theo thứ tự hiện tại', () => {
    let state = withFile('a', 6)
    state = workspaceReducer(state, { type: 'select', id: 'a-5', mode: 'toggle' })
    state = workspaceReducer(state, { type: 'select', id: 'a-2', mode: 'range' })
    expect([...state.selected].sort()).toEqual(['a-2', 'a-3', 'a-4', 'a-5'])
  })

  it('thao tác không đổi gì thì không sinh mốc lịch sử', () => {
    const state = withFile('a', 2)
    const same = workspaceReducer(state, { type: 'edit', next: (pages) => pages })
    expect(same).toBe(state)
  })

  it('thay trang chỉ đổi trang đích và ghi nhận tệp mới', () => {
    const state = workspaceReducer(withFile('a', 3), {
      type: 'replace',
      source: source('b', 5),
      page: { id: 'b-4', sourceId: 'b', pageIndex: 3, rotation: 0 },
      targetId: 'a-2',
    })
    expect(state.pages.map((page) => page.id)).toEqual(['a-1', 'b-4', 'a-3'])
    expect(state.sources.b).toBeDefined()
  })

  it('lần sửa sinh nguồn mới (cắt trang) ghi nhận nguồn, hoàn tác vẫn giữ nguồn', () => {
    const cut: PageRef = { id: 'a-2', sourceId: 'cut', pageIndex: 0, rotation: 0 }
    const state = workspaceReducer(withFile('a', 3), {
      type: 'edit',
      next: (pages) => pages.map((page) => (page.id === 'a-2' ? cut : page)),
      sources: [source('cut', 1)],
    })
    expect(state.pages[1]).toBe(cut)
    expect(state.sources.cut).toBeDefined()
    const undone = workspaceReducer(state, { type: 'undo' })
    expect(undone.pages[1].sourceId).toBe('a')
    expect(undone.sources.cut).toBeDefined()
  })

  describe('trang trí', () => {
    const withWatermark = (text: string): Decorations => ({ headerFooter: null, watermark: { ...DEFAULT_WATERMARK, text } })

    it('hoàn tác trang trí cùng chồng với thao tác trang', () => {
      let state = withFile('a', 2)
      state = workspaceReducer(state, { type: 'decorate', decorations: { headerFooter: DEFAULT_HEADER_FOOTER, watermark: null } })
      state = workspaceReducer(state, { type: 'edit', next: (pages) => rotatePages(pages, ['a-1'], 90) })

      state = workspaceReducer(state, { type: 'undo' })
      expect(state.pages[0].rotation).toBe(0)
      expect(state.decorations.headerFooter).not.toBeNull()

      state = workspaceReducer(state, { type: 'undo' })
      expect(state.decorations.headerFooter).toBeNull()
      expect(state.pages).toHaveLength(2)

      state = workspaceReducer(workspaceReducer(state, { type: 'redo' }), { type: 'redo' })
      expect(state.decorations.headerFooter).not.toBeNull()
      expect(state.pages[0].rotation).toBe(90)
    })

    it('gộp các lần sửa liên tiếp cùng khoá thành một mốc', () => {
      let state = withFile('a', 1)
      for (const text of ['B', 'BẢ', 'BẢN']) {
        state = workspaceReducer(state, { type: 'decorate', decorations: withWatermark(text), mergeKey: 'watermark.text' })
      }
      expect(state.decorations.watermark?.text).toBe('BẢN')

      state = workspaceReducer(state, { type: 'undo' })
      expect(state.decorations.watermark).toBeNull()
    })

    it('khoá khác hoặc có thao tác xen giữa thì tách mốc', () => {
      let state = withFile('a', 1)
      state = workspaceReducer(state, { type: 'decorate', decorations: withWatermark('A'), mergeKey: 'watermark.text' })
      state = workspaceReducer(state, { type: 'undo' })
      state = workspaceReducer(state, { type: 'redo' })
      state = workspaceReducer(state, { type: 'decorate', decorations: withWatermark('AB'), mergeKey: 'watermark.text' })

      state = workspaceReducer(state, { type: 'undo' })
      expect(state.decorations.watermark?.text).toBe('A')
    })
  })
})
