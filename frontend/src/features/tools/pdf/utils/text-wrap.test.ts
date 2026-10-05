import { describe, expect, it } from 'vitest'
import { wrapText } from './text-wrap'

// Mỗi ký tự rộng 1 — bề rộng dòng = số ký tự.
const chars = (line: string) => line.length

describe('wrapText', () => {
  it('dồn từ vào dòng tới khi tràn', () => {
    expect(wrapText('Hợp đồng thi công gói thầu XL-03', 12, chars)).toEqual(['Hợp đồng thi', 'công gói', 'thầu XL-03'])
  })

  it('giữ xuống dòng người gõ và dòng trống', () => {
    expect(wrapText('Điều 1\n\nĐiều 2', 20, chars)).toEqual(['Điều 1', '', 'Điều 2'])
  })

  it('bẻ từ dài hơn cả dòng theo ký tự', () => {
    expect(wrapText('mã HD-2026-000123 xong', 6, chars)).toEqual(['mã', 'HD-202', '6-0001', '23', 'xong'])
  })
})

describe('wrapText với bề rộng theo dòng', () => {
  it('dòng đầu thụt vào hẹp hơn các dòng sau', () => {
    expect(wrapText('Hợp đồng thi công gói thầu', (line) => (line === 0 ? 8 : 14), chars)).toEqual(['Hợp đồng', 'thi công gói', 'thầu'])
  })
})
