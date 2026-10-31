import { expect, it } from 'vitest'
import { scoreOcrOrientation, selectOcrOrientation, strongOcrOrientation } from './ocr-orientation'
import type { OcrLine } from './ocr-runs'

const lines = (text: string, confidence: number, vertical = false): OcrLine[] => [{
  bbox: { x0: 0, y0: 0, x1: 400, y1: 24 }, baseline: { x0: 0, y0: 20, x1: 400, y1: 20 },
  words: text.split(' ').map((text, i) => ({ text, confidence,
    bbox: { x0: i * 50, y0: 0, x1: i * 50 + (vertical ? 8 : 45), y1: vertical ? 60 : 24 } })),
}]

it('chooses readable text at 90, 180 and 270 degrees instead of noisy sideways words', () => {
  for (const rotation of [90, 180, 270] as const) {
    const original = scoreOcrOrientation(0, lines('s z xx yy', 65))
    const upright = scoreOcrOrientation(rotation, lines('HÓA ĐƠN GIÁ TRỊ GIA TĂNG CÔNG TY THƯƠNG MẠI DỊCH VỤ', 94))
    expect(selectOcrOrientation([original, upright])).toBe(rotation)
  }
})

it('does not choose a direction from vertical labels, isolated digits, blank images or a near tie', () => {
  expect(scoreOcrOrientation(90, lines('CÔNG TRƯỜNG', 99, true)).letters).toBe(0)
  expect(scoreOcrOrientation(90, lines('01 12345 90.000', 99)).score).toBe(0)
  expect(selectOcrOrientation([scoreOcrOrientation(0, []), scoreOcrOrientation(180, [])])).toBe(0)
  const text = 'Nội dung tài liệu cần giữ đúng hướng chữ khi tạo bản scan'
  expect(selectOcrOrientation([scoreOcrOrientation(0, lines(text, 90)), scoreOcrOrientation(180, lines(text, 92))])).toBe(0)
})

it('recognizes a strong upright reading without requiring the page to be portrait', () => {
  const reading = scoreOcrOrientation(0, lines('Thông tin tài liệu kiểm tra hướng chữ giữ nguyên trang ngang '.repeat(4), 96))
  expect(strongOcrOrientation(reading)).toBe(true)
})
