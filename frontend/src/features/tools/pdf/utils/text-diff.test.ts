import { describe, expect, it } from 'vitest'
import { compareLines, diffKeys, formatComparison, lineKey, type CompareOptions, type DocLine, type Edit } from './text-diff'

const STRICT: CompareOptions = { ignoreSpace: false, ignoreCase: false }
const LOOSE: CompareOptions = { ignoreSpace: true, ignoreCase: false }

/** Áp chuỗi sửa lên `a` — kết quả phải ra đúng `b`, bất kể thuật toán chọn đường nào. */
function apply(a: string[], b: string[], edits: Edit[]): { before: string[]; after: string[] } {
  const before: string[] = []
  const after: string[] = []
  for (const edit of edits) {
    if (edit.kind !== 'add') before.push(a[edit.a])
    if (edit.kind !== 'remove') after.push(b[edit.b])
    if (edit.kind === 'same') expect(a[edit.a]).toBe(b[edit.b])
  }
  return { before, after }
}

const changes = (edits: Edit[]) => edits.filter((edit) => edit.kind !== 'same').length

/** Khoảng cách sửa nhỏ nhất (chỉ thêm / bỏ) tính bằng quy hoạch động — để đối chiếu Myers. */
function distance(a: string[], b: string[]): number {
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) lcs[i][j] = a[i - 1] === b[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1])
  return a.length + b.length - 2 * lcs[a.length][b.length]
}

describe('diffKeys', () => {
  it('reports identical inputs as all same', () => {
    const { edits, exact } = diffKeys(['a', 'b'], ['a', 'b'])
    expect(exact).toBe(true)
    expect(edits).toEqual([
      { kind: 'same', a: 0, b: 0 },
      { kind: 'same', a: 1, b: 1 },
    ])
  })

  it('handles empty sides', () => {
    expect(diffKeys([], []).edits).toEqual([])
    expect(diffKeys([], ['x']).edits).toEqual([{ kind: 'add', b: 0 }])
    expect(diffKeys(['x'], []).edits).toEqual([{ kind: 'remove', a: 0 }])
  })

  it('finds a single replaced line between common head and tail', () => {
    const { edits } = diffKeys(['a', 'b', 'c'], ['a', 'x', 'c'])
    expect(edits).toEqual([{ kind: 'same', a: 0, b: 0 }, { kind: 'remove', a: 1 }, { kind: 'add', b: 1 }, { kind: 'same', a: 2, b: 2 }])
  })

  it('rebuilds both sides and is minimal on pseudo-random inputs', () => {
    let seed = 7
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff)
    for (let round = 0; round < 200; round++) {
      const a = Array.from({ length: next() % 12 }, () => 'abcd'[next() % 4])
      const b = Array.from({ length: next() % 12 }, () => 'abcd'[next() % 4])
      const { edits, exact } = diffKeys(a, b)
      expect(exact).toBe(true)
      expect(apply(a, b, edits)).toEqual({ before: a, after: b })
      expect(changes(edits)).toBe(distance(a, b))
    }
  })

  it('falls back to remove-all then add-all past the distance cap, keeping the common ends', () => {
    const { edits, exact } = diffKeys(['h', 'a', 'b', 't'], ['h', 'x', 'y', 't'], 2)
    expect(exact).toBe(false)
    expect(edits).toEqual([{ kind: 'same', a: 0, b: 0 }, { kind: 'remove', a: 1 }, { kind: 'remove', a: 2 }, { kind: 'add', b: 1 }, { kind: 'add', b: 2 }, { kind: 'same', a: 3, b: 3 }])
  })
})

describe('lineKey', () => {
  it('collapses whitespace only when asked', () => {
    expect(lineKey('  Điều  1.\tPhạm vi ', LOOSE)).toBe('Điều 1. Phạm vi')
    expect(lineKey('a  b', STRICT)).toBe('a  b')
  })

  it('folds case and composes Vietnamese marks', () => {
    expect(lineKey('ĐIỀU KHOẢN', { ignoreSpace: false, ignoreCase: true })).toBe('điều khoản')
    expect(lineKey('ế', STRICT)).toBe('ế')
  })
})

const doc = (pages: string[][]): DocLine[] => pages.flatMap((lines, index) => lines.map((text) => ({ text, page: index + 1 })))

describe('compareLines', () => {
  it('finds nothing in two equal documents', () => {
    const lines = doc([['a', 'b']])
    expect(compareLines(lines, lines, STRICT)).toEqual({ hunks: [], added: 0, removed: 0, exact: true })
  })

  it('ignores spacing differences when asked, and shows the new text for kept lines', () => {
    const result = compareLines(doc([['Giá  trị: 100', 'x']]), doc([['Giá trị: 100', 'y']]), LOOSE)
    expect(result.added).toBe(1)
    expect(result.removed).toBe(1)
    expect(result.hunks[0].lines).toEqual([
      { kind: 'same', text: 'Giá trị: 100' },
      { kind: 'remove', text: 'x' },
      { kind: 'add', text: 'y' },
    ])
    expect(compareLines(doc([['Giá  trị: 100']]), doc([['Giá trị: 100']]), STRICT).removed).toBe(1)
  })

  it('keeps context around a change and names the page on each side', () => {
    const before = doc([['1', '2', '3', '4'], ['5', '6', '7', '8', '9']])
    const after = doc([['1', '2', '3'], ['4', '5', '6', 'bảy', '8', '9']])
    const { hunks } = compareLines(before, after, STRICT, 1)
    expect(hunks).toEqual([
      {
        oldPage: 2,
        newPage: 2,
        lines: [
          { kind: 'same', text: '6' },
          { kind: 'remove', text: '7' },
          { kind: 'add', text: 'bảy' },
          { kind: 'same', text: '8' },
        ],
      },
    ])
  })

  it('merges nearby changes into one hunk and splits distant ones', () => {
    const before = doc([['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']])
    const near = compareLines(before, doc([['A', 'b', 'c', 'D', 'e', 'f', 'g', 'h', 'i', 'j']]), STRICT, 1)
    expect(near.hunks).toHaveLength(1)
    const far = compareLines(before, doc([['A', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'J']]), STRICT, 1)
    expect(far.hunks).toHaveLength(2)
  })

  it('names the page of the first change, not of the context line before it', () => {
    const before = doc([['1', '2'], ['3', '4']])
    const after = doc([['1', '2'], ['ba', '4']])
    expect(compareLines(before, after, STRICT, 2).hunks[0]).toMatchObject({ oldPage: 2, newPage: 2 })
    // Chỉ thêm dòng ở đầu trang 2: bản cũ lấy trang của dòng kế sau chỗ thêm.
    expect(compareLines(before, doc([['1', '2'], ['mới', '3', '4']]), STRICT, 2).hunks[0]).toMatchObject({ oldPage: 2, newPage: 2 })
  })

  it('marks a hunk that exists on one side only', () => {
    const { hunks } = compareLines([], doc([['mới']]), STRICT)
    expect(hunks[0]).toMatchObject({ oldPage: null, newPage: 1 })
  })
})

describe('formatComparison', () => {
  const names = { before: 'cu.pdf', after: 'moi.pdf' }

  it('says so when nothing differs', () => {
    expect(formatComparison({ hunks: [], added: 0, removed: 0, exact: true }, names)).toBe('SO SÁNH TÀI LIỆU\nBản cũ: cu.pdf\nBản mới: moi.pdf\nKhông có dòng chữ nào khác nhau.')
  })

  it('prefixes removed and added lines', () => {
    const result = compareLines(doc([['a', 'b']]), doc([['a', 'c']]), STRICT)
    expect(formatComparison(result, names)).toBe(
      ['SO SÁNH TÀI LIỆU', 'Bản cũ: cu.pdf', 'Bản mới: moi.pdf', '1 chỗ khác · bỏ 1 dòng (-) · thêm 1 dòng (+)', '', '@@ Chỗ 1 — Bản cũ trang 1 · Bản mới trang 1 @@', '  a', '- b', '+ c'].join('\n'),
    )
  })
})
