import { describe, expect, it } from 'vitest'
import type { PageRef } from '../types/doc-tools.types'
import {
  combinePages,
  deletePages,
  duplicatePages,
  insertPages,
  movePages,
  parsePageRanges,
  replacePage,
  rotatePages,
  appendPageMarkups,
  setPageMarkups,
  shiftPage,
} from './page-ops'

function pagesOf(sourceId: string, count: number): PageRef[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sourceId}-${index + 1}`,
    sourceId,
    pageIndex: index,
    rotation: 0,
  }))
}

const ids = (pages: PageRef[]) => pages.map((page) => page.id)

function idMaker(prefix = 'new') {
  let n = 0
  return () => `${prefix}-${++n}`
}

describe('insertPages', () => {
  it('chèn sau trang 37 không lệch các trang còn lại', () => {
    const base = pagesOf('a', 50)
    const added = pagesOf('b', 3)
    const result = insertPages(base, added, 'a-37', 'after')

    expect(result).toHaveLength(53)
    expect(ids(result.slice(36, 40))).toEqual(['a-37', 'b-1', 'b-2', 'b-3'])
    expect(result[40].id).toBe('a-38')
    expect(ids(result.filter((page) => page.sourceId === 'a'))).toEqual(ids(base))
  })

  it('chèn trước trang đầu', () => {
    const result = insertPages(pagesOf('a', 2), pagesOf('b', 1), 'a-1', 'before')
    expect(ids(result)).toEqual(['b-1', 'a-1', 'a-2'])
  })

  it('không có anchor hoặc anchor đã bị xoá thì thêm vào cuối', () => {
    expect(ids(insertPages(pagesOf('a', 2), pagesOf('b', 1), null, 'after'))).toEqual(['a-1', 'a-2', 'b-1'])
    expect(ids(insertPages(pagesOf('a', 2), pagesOf('b', 1), 'gone', 'before'))).toEqual(['a-1', 'a-2', 'b-1'])
  })

  it('ghép 3 PDF + 5 ảnh: đủ trang, đúng thứ tự thả vào', () => {
    let pages: PageRef[] = []
    for (const [source, count] of [['p1', 4], ['p2', 2], ['p3', 7], ['i1', 1], ['i2', 1], ['i3', 1], ['i4', 1], ['i5', 1]] as const) {
      pages = insertPages(pages, pagesOf(source, count), null, 'after')
    }
    expect(pages).toHaveLength(18)
    expect([...new Set(pages.map((page) => page.sourceId))]).toEqual(['p1', 'p2', 'p3', 'i1', 'i2', 'i3', 'i4', 'i5'])
  })
})

describe('replacePage', () => {
  it('chỉ thay đúng trang đích', () => {
    const base = pagesOf('a', 5)
    const result = replacePage(base, 'a-3', pagesOf('b', 1))
    expect(ids(result)).toEqual(['a-1', 'a-2', 'b-1', 'a-4', 'a-5'])
  })

  it('trang đích không tồn tại thì giữ nguyên', () => {
    const base = pagesOf('a', 3)
    expect(ids(replacePage(base, 'x', pagesOf('b', 1)))).toEqual(ids(base))
  })
})

describe('deletePages / duplicatePages / rotatePages', () => {
  it('xoá nhiều trang không đụng trang khác', () => {
    expect(ids(deletePages(pagesOf('a', 5), ['a-2', 'a-4']))).toEqual(['a-1', 'a-3', 'a-5'])
  })

  it('nhân bản đặt ngay sau trang gốc với id mới', () => {
    const result = duplicatePages(pagesOf('a', 3), ['a-1', 'a-3'], idMaker())
    expect(ids(result)).toEqual(['a-1', 'new-1', 'a-2', 'a-3', 'new-2'])
    expect(result[1].pageIndex).toBe(0)
  })

  it('xoay vòng qua 0 theo cả hai chiều', () => {
    const [page] = rotatePages(pagesOf('a', 1), ['a-1'], -90)
    expect(page.rotation).toBe(270)
    const [back] = rotatePages([page], ['a-1'], 90)
    expect(back.rotation).toBe(0)
  })
})

describe('movePages', () => {
  it('kéo một trang về đầu', () => {
    expect(ids(movePages(pagesOf('a', 4), ['a-3'], 0))).toEqual(['a-3', 'a-1', 'a-2', 'a-4'])
  })

  it('kéo xuống sau: điểm thả tính trên mảng cũ', () => {
    // Thả vào khe trước a-4 (chỉ số 3) → a-1 phải đứng ngay trước a-4.
    expect(ids(movePages(pagesOf('a', 4), ['a-1'], 3))).toEqual(['a-2', 'a-3', 'a-1', 'a-4'])
  })

  it('kéo nhiều trang rời rạc giữ thứ tự tương đối', () => {
    expect(ids(movePages(pagesOf('a', 6), ['a-5', 'a-2'], 0))).toEqual(['a-2', 'a-5', 'a-1', 'a-3', 'a-4', 'a-6'])
  })

  it('thả về cuối', () => {
    expect(ids(movePages(pagesOf('a', 3), ['a-1'], 3))).toEqual(['a-2', 'a-3', 'a-1'])
  })
})

describe('shiftPage', () => {
  it('đổi chỗ với trang bên cạnh, không vượt biên', () => {
    const base = pagesOf('a', 3)
    expect(ids(shiftPage(base, 'a-2', 1))).toEqual(['a-1', 'a-3', 'a-2'])
    expect(shiftPage(base, 'a-1', -1)).toBe(base)
    expect(shiftPage(base, 'a-3', 1)).toBe(base)
  })
})

describe('parsePageRanges', () => {
  it('đọc khoảng và trang lẻ thành nhóm chỉ số từ 0', () => {
    expect(parsePageRanges('1-3, 5; 8 – 9', 10)).toEqual({ ok: true, groups: [[0, 1, 2], [4], [7, 8]] })
  })

  it('báo lỗi thay vì bỏ qua trang ngoài phạm vi', () => {
    const result = parsePageRanges('1-3, 12', 10)
    expect(result.ok).toBe(false)
  })

  it('báo lỗi khoảng ngược và chuỗi rác', () => {
    expect(parsePageRanges('5-2', 10).ok).toBe(false)
    expect(parsePageRanges('abc', 10).ok).toBe(false)
    expect(parsePageRanges('  ', 10).ok).toBe(false)
    expect(parsePageRanges('0', 10).ok).toBe(false)
  })
})

describe('setPageMarkups', () => {
  const pages: PageRef[] = [
    { id: 'a', sourceId: 's', pageIndex: 0, rotation: 0 },
    { id: 'b', sourceId: 's', pageIndex: 1, rotation: 0 },
  ]
  const pen = { id: 'm', kind: 'pen' as const, color: 'red' as const, width: 1 as const, points: [{ x: 0, y: 0 }] }

  it('only touches the target page', () => {
    const next = setPageMarkups(pages, 'b', [pen])
    expect(next[0]).toBe(pages[0])
    expect(next[1].markups).toEqual([pen])
  })

  it('removes the key when the last markup goes', () => {
    expect('markups' in setPageMarkups(setPageMarkups(pages, 'a', [pen]), 'a', [])[0]).toBe(false)
  })

  it('carries markups along when a page is duplicated', () => {
    const [, copy] = duplicatePages(setPageMarkups(pages, 'a', [pen]), ['a'], () => 'a2')
    expect(copy).toMatchObject({ id: 'a2', markups: [pen] })
  })
})

describe('appendPageMarkups', () => {
  const pages: PageRef[] = [
    { id: 'a', sourceId: 's', pageIndex: 0, rotation: 0 },
    { id: 'b', sourceId: 's', pageIndex: 1, rotation: 0 },
  ]
  const pen = { id: 'm', kind: 'pen' as const, color: 'red' as const, width: 1 as const, points: [{ x: 0, y: 0 }] }
  const pen2 = { ...pen, id: 'n' }

  it('appends to several pages in one edit and leaves the rest untouched', () => {
    const start = setPageMarkups(pages, 'a', [pen])
    const next = appendPageMarkups(start, new Map([['a', [pen2]], ['b', [pen]]]))
    expect(next[0].markups).toEqual([pen, pen2])
    expect(next[1].markups).toEqual([pen])
  })

  it('returns the same array when nothing is added', () => {
    expect(appendPageMarkups(pages, new Map())).toBe(pages)
    expect(appendPageMarkups(pages, new Map([['zz', [pen]]]))).toBe(pages)
  })
})

describe('combinePages', () => {
  const pages = pagesOf('img', 5)
  const merge = (group: PageRef[]): PageRef => ({ id: `c(${group.map((page) => page.id).join('+')})`, sourceId: 'c', pageIndex: 0, rotation: 0 })

  it('groups the chosen pages in document order and puts each group where its first page was', () => {
    const ids = ['img-5', 'img-2', 'img-3', 'img-4']
    expect(combinePages(pages, ids, 2, merge).map((page) => page.id)).toEqual(['img-1', 'c(img-2+img-3)', 'c(img-4+img-5)'])
  })

  it('leaves a lone leftover page as it is', () => {
    expect(combinePages(pages, ['img-1', 'img-2', 'img-3'], 2, merge).map((page) => page.id)).toEqual(['c(img-1+img-2)', 'img-3', 'img-4', 'img-5'])
    expect(combinePages(pages, ['img-1'], 4, merge)).toBe(pages)
  })

  it('skips a group the caller declines', () => {
    expect(combinePages(pages, ['img-1', 'img-2'], 2, () => null)).toBe(pages)
  })

  it('packs up to four pages per group', () => {
    expect(combinePages(pages, pages.map((page) => page.id), 4, merge).map((page) => page.id)).toEqual(['c(img-1+img-2+img-3+img-4)', 'img-5'])
  })
})
