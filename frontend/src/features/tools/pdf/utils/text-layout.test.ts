import { describe, expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import { buildParagraphs, buildTable, layoutPage, parseCellValue, tableValues } from './text-layout'

function run(text: string, x: number, y: number, width: number, extra: Partial<TextRun> = {}): TextRun {
  return { text, origin: { x, y }, angle: 0, size: 10, width, ascent: 0.8, descent: 0.2, fontName: 'f1', fontFamily: 'sans-serif', eol: false, ...extra }
}

describe('layoutPage', () => {
  it('joins pieces of one word, spaces words and splits cells at wide gaps', () => {
    const { lines } = layoutPage([
      run('Hợ', 50, 100, 12),
      run('p', 62, 100.4, 5),
      run('đồng', 70, 100, 22),
      run('12.500', 300, 100, 30),
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0].segments.map((segment) => segment.text)).toEqual(['Hợp đồng', '12.500'])
  })

  it('ignores the wide space pieces pdf.js puts between table cells', () => {
    const { lines } = layoutPage([
      run('Xi măng', 50, 100, 40),
      run(' ', 90, 100, 120),
      run('tấn', 210, 100, 15),
      run(' ', 225, 100, 3),
      run('bao', 228, 100, 15),
    ])
    expect(lines[0].segments.map((segment) => segment.text)).toEqual(['Xi măng', 'tấn bao'])
  })

  it('reads a page whose text runs upward (a scan the user turned) as normal lines', () => {
    // Khung gốc 600 × 400; chữ chạy từ dưới lên (góc 90°) — như OCR trên trang đã xoay phải.
    const up = (text: string, x: number, y: number, width: number) => run(text, x, y, width, { angle: 90 })
    const layout = layoutPage([up('Biên', 100, 300, 20), up('bản', 100, 275, 20), up('nghiệm', 115, 300, 30)], { width: 600, height: 400 })
    expect(layout.turn).toBe(90)
    expect(layout.size).toEqual({ width: 400, height: 600 })
    expect(layout.lines.map((line) => line.segments.map((segment) => segment.text))).toEqual([['Biên bản'], ['nghiệm']])
    expect(layout.rotated).toEqual([])
  })

  it('orders lines top to bottom and keeps rotated text apart', () => {
    const { lines, rotated } = layoutPage([
      run('dưới', 50, 200, 20),
      run('ĐÃ DUYỆT', 400, 300, 40, { angle: 30, eol: true }),
      run('trên', 50, 100, 20),
    ])
    expect(lines.map((line) => line.segments[0].text)).toEqual(['trên', 'dưới'])
    expect(rotated).toEqual(['ĐÃ DUYỆT'])
  })
})

describe('buildParagraphs', () => {
  const body = (text: string, y: number, width = 400, x = 50) => layoutPage([run(text, x, y, width)]).lines[0]

  it('merges wrapped lines and breaks at a short line', () => {
    const lines = [body('Dòng một chạy tới mép phải', 100), body('dòng hai ngắn', 112, 120), body('Mục mới', 124)]
    const paragraphs = buildParagraphs(lines)
    expect(paragraphs.map((paragraph) => paragraph.lines.length)).toEqual([2, 1])
  })

  it('centres titles and records the gap above', () => {
    const lines = [body('Dòng đầy đủ để lấy bề ngang vùng chữ', 100), body('TIÊU ĐỀ', 160, 100, 200)]
    const [, title] = buildParagraphs(lines)
    expect(title.align).toBe('center')
    expect(title.spaceBefore).toBe(48)
  })

  it('never merges tabular lines', () => {
    const row = (y: number) => layoutPage([run('Xi măng', 50, y, 40), run('1.250', 300, y, 25)]).lines[0]
    expect(buildParagraphs([row(100), row(112)]).map((paragraph) => paragraph.tabular)).toEqual([true, true])
  })
})

describe('buildTable', () => {
  it('puts right-aligned numbers in one column', () => {
    const { lines } = layoutPage([
      run('Thép', 50, 100, 20),
      run('1.000', 310, 100, 25),
      run('Cát vàng', 50, 112, 38),
      run('125.000', 300, 112, 35),
      run('Tổng hợp vật tư', 50, 80, 80),
    ])
    const table = buildTable(lines)
    expect(table.columns).toHaveLength(2)
    expect(table.rows).toEqual([
      ['Tổng hợp vật tư', ''],
      ['Thép', '1.000'],
      ['Cát vàng', '125.000'],
    ])
  })

  it('keeps a spanning title in the first column and a code column as text', () => {
    const { lines } = layoutPage([
      run('BẢNG KÊ VẬT TƯ THÁNG 09', 120, 80, 250),
      run('0123', 50, 100, 20),
      run('Xi măng', 100, 100, 40),
      run('1.650.000', 300, 100, 45),
      run('1102', 50, 112, 20),
      run('Đá 1x2', 100, 112, 30),
      run('385.000', 310, 112, 35),
    ])
    const table = buildTable(lines)
    expect(table.rows[0][0]).toBe('BẢNG KÊ VẬT TƯ THÁNG 09')
    expect(tableValues(table).slice(1)).toEqual([
      ['0123', 'Xi măng', 1650000],
      ['1102', 'Đá 1x2', 385000],
    ])
  })
})

describe('parseCellValue', () => {
  it('reads Vietnamese numbers and keeps codes as text', () => {
    expect(parseCellValue('1.234.567')).toBe(1234567)
    expect(parseCellValue('12,5')).toBe(12.5)
    expect(parseCellValue('-3.000,75')).toBe(-3000.75)
    expect(parseCellValue('42')).toBe(42)
    expect(parseCellValue('0123')).toBe('0123')
    expect(parseCellValue('12/2026/HĐ')).toBe('12/2026/HĐ')
  })
})
