import { describe, expect, it } from 'vitest'
import type { PageRef } from '../types/doc-tools.types'
import { isUntouched, NO_PAGES, syncOrganized } from './organize'

const item = (id: string, count: number) => ({
  source: { id },
  pages: Array.from({ length: count }, (_, pageIndex): PageRef => ({ id: `${id}${pageIndex + 1}`, sourceId: id, pageIndex, rotation: 0 })),
})

const ids = (pages: PageRef[]) => pages.map((page) => page.id)

describe('syncOrganized', () => {
  it('nạp tệp đầu tiên: lấy mọi trang theo thứ tự của tệp', () => {
    expect(ids(syncOrganized(NO_PAGES, [item('a', 3)]).pages)).toEqual(['a1', 'a2', 'a3'])
  })

  it('bộ tệp không đổi thì trả lại đúng trạng thái cũ', () => {
    const state = syncOrganized(NO_PAGES, [item('a', 2)])
    expect(syncOrganized(state, [item('a', 2)])).toBe(state)
  })

  it('thêm tệp: giữ thứ tự, góc xoay và trang đã bỏ; trang mới nối vào cuối', () => {
    const a = item('a', 3)
    const sorted = { sourceIds: ['a'], pages: [{ ...a.pages[2], rotation: 90 as const }, a.pages[0]] }
    const next = syncOrganized(sorted, [a, item('b', 2)])
    expect(ids(next.pages)).toEqual(['a3', 'a1', 'b1', 'b2'])
    expect(next.pages[0].rotation).toBe(90)
  })

  it('gỡ tệp: trang của tệp đó đi theo, trang còn lại giữ nguyên chỗ', () => {
    const a = item('a', 2)
    const b = item('b', 2)
    const mixed = { sourceIds: ['a', 'b'], pages: [b.pages[1], a.pages[0], b.pages[0], a.pages[1]] }
    expect(ids(syncOrganized(mixed, [b]).pages)).toEqual(['b2', 'b1'])
  })
})

describe('isUntouched', () => {
  const a = item('a', 3)

  it('đúng khi lưới còn y như tệp gốc', () => {
    expect(isUntouched(a.pages, [a])).toBe(true)
  })

  it('sai khi đổi chỗ, xoay hoặc bỏ trang', () => {
    expect(isUntouched([a.pages[1], a.pages[0], a.pages[2]], [a])).toBe(false)
    expect(isUntouched([{ ...a.pages[0], rotation: 180 }, a.pages[1], a.pages[2]], [a])).toBe(false)
    expect(isUntouched(a.pages.slice(0, 2), [a])).toBe(false)
  })
})
