import { describe, expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import { snappedMarkups } from './markup-draft'
import { caretAt, lineAround, pageSegments, selectedLines, wholeSegments } from './text-select'

function run(text: string, x: number, y: number, width: number, angle = 0, size = 10): TextRun {
  return { text, origin: { x, y }, angle, size, width, ascent: 0.8, descent: 0.2, fontName: 'f', fontFamily: 'sans-serif', eol: false }
}

const runs: TextRun[] = [
  run('Hợp đồng thi công', 100, 200, 100),
  run(' — trang 1', 200, 200, 50),
  run('Gói thầu', 100, 220, 40),
  run('ROTATE', 300, 400, 60, 90),
  run('nghiêng', 400, 100, 40, 30),
  run('   ', 150, 240, 20),
]

const style = { color: 'yellow', width: 2, preset: 'approved' } as const

describe('caretAt', () => {
  it('đặt con trỏ vào ranh giới ký tự gần nhất trong mảnh bị nhấn', () => {
    expect(caretAt(runs, { x: 147, y: 197 }, 2)).toEqual({ run: 0, offset: 8 })
  })

  it('ngoài tầm với thì không có con trỏ; tầm vô hạn thì bám dòng gần nhất', () => {
    expect(caretAt(runs, { x: 120, y: 208 }, 2)).toBeNull()
    expect(caretAt(runs, { x: 120, y: 208 }, Infinity)?.run).toBe(2)
  })

  it('bỏ qua chữ nghiêng lệch và mảnh chỉ có khoảng trắng', () => {
    expect(caretAt(runs, { x: 410, y: 95 }, 3)).toBeNull()
    expect(caretAt(runs, { x: 160, y: 238 }, 1)).toBeNull()
  })
})

describe('selectedLines', () => {
  it('gộp các mảnh cùng dòng thành một khúc, cắt khoảng trắng đầu mảnh', () => {
    const lines = selectedLines(runs, { run: 0, offset: 0 }, { run: 1, offset: 10 })
    expect(lines).toHaveLength(1)
    expect(lines[0].start).toEqual({ x: 100, y: 200 })
    expect(lines[0].length).toBeCloseTo(150)
    expect(lines[0].top).toBeCloseTo(-8)
    expect(lines[0].bottom).toBeCloseTo(2)
  })

  it('kéo qua hai dòng ra hai khúc, kéo ngược cũng vậy', () => {
    const forward = selectedLines(runs, { run: 0, offset: 9 }, { run: 2, offset: 3 })
    expect(forward).toHaveLength(2)
    expect(forward[1].start).toEqual({ x: 100, y: 220 })
    expect(forward[1].length).toBeCloseTo(15)
    expect(selectedLines(runs, { run: 2, offset: 3 }, { run: 0, offset: 9 })).toEqual(forward)
  })

  it('không chọn được gì khi hai con trỏ trùng nhau', () => {
    expect(selectedLines(runs, { run: 0, offset: 4 }, { run: 0, offset: 4 })).toEqual([])
  })
})

describe('snappedMarkups', () => {
  const rotated = selectedLines(runs, { run: 3, offset: 0 }, { run: 3, offset: 6 })

  it('tô sáng chữ dọc: khung thẳng bao đúng dòng chữ', () => {
    const [mark] = snappedMarkups('highlight', 'm', style, rotated)
    expect(mark.kind).toBe('highlight')
    if (mark.kind !== 'highlight') return
    expect(mark.box.x).toBeCloseTo(292)
    expect(mark.box.y).toBeCloseTo(340)
    expect(mark.box.width).toBeCloseTo(10)
    expect(mark.box.height).toBeCloseTo(60)
  })

  it('gạch chân chữ dọc giữ hướng chữ, mỗi dòng một id riêng', () => {
    const marks = snappedMarkups('underline', 'm', style, [...rotated, ...selectedLines(runs, { run: 2, offset: 0 }, { run: 2, offset: 8 })])
    expect(marks.map((mark) => mark.id)).toEqual(['m-0', 'm-1'])
    const [first] = marks
    if (first.kind !== 'underline') throw new Error(first.kind)
    expect(first.frame.turn).toBe(90)
    expect(first.frame.origin.x).toBeCloseTo(292)
    expect(first.frame.origin.y).toBeCloseTo(400)
    expect(first.frame.width).toBeCloseTo(60)
    expect(first.frame.height).toBeCloseTo(10)
  })
})

describe('khúc chữ', () => {
  // Dòng danh sách của Word: chấm đầu dòng ở phông Symbol (vùng dùng riêng), rồi chữ; dòng bảng: hai ô cách xa nhau.
  const list: TextRun[] = [
    run('\uF0B7', 80, 300, 5),
    run('Mọi agent có identity riêng', 98, 300, 130),
    run(' và trace được.', 228, 300, 70),
    run('1.', 80, 320, 9),
    run('Phạm vi áp dụng', 98, 320, 80),
    run('Hạng mục', 80, 340, 45),
    run('Khối lượng', 300, 340, 50),
    run('Dòng thường', 80, 360, 60),
    run('   ', 140, 360, 6),
    run('nối tiếp', 146, 360, 40),
  ]

  it('bấm vào dòng danh sách không kéo theo ký hiệu / số thứ tự đầu dòng', () => {
    expect(lineAround(list, 2)).toEqual([{ run: 1, offset: 0 }, { run: 2, offset: 15 }])
    expect(lineAround(list, 4)).toEqual([{ run: 4, offset: 0 }, { run: 4, offset: 15 }])
  })

  it('khoảng trống rộng tách hai ô của một dòng bảng; mảnh trắng không ngắt khúc', () => {
    expect(lineAround(list, 5)[1]).toEqual({ run: 5, offset: 8 })
    expect(lineAround(list, 6)[0]).toEqual({ run: 6, offset: 0 })
    expect(lineAround(list, 7)).toEqual([{ run: 7, offset: 0 }, { run: 9, offset: 8 }])
  })

  it('nới vùng kéo ra trọn khúc ở hai đầu; thả ở đầu dòng sau thì không lấy dòng ấy', () => {
    expect(wholeSegments(list, { run: 2, offset: 4 }, { run: 1, offset: 9 })).toEqual([{ run: 1, offset: 0 }, { run: 2, offset: 15 }])
    expect(wholeSegments(list, { run: 1, offset: 3 }, { run: 3, offset: 0 })).toEqual([{ run: 1, offset: 0 }, { run: 2, offset: 15 }])
  })

  it('liệt kê mọi khúc chữ của trang, mỗi khúc một dòng', () => {
    expect(pageSegments(list).map((segment) => segment.text)).toEqual([
      '\uF0B7',
      'Mọi agent có identity riêng và trace được.',
      '1.',
      'Phạm vi áp dụng',
      'Hạng mục',
      'Khối lượng',
      'Dòng thường nối tiếp',
    ])
  })
})
