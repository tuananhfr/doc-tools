import { expect, it } from 'vitest'
import type { OcrLine } from './ocr-runs'
import { mergeFormReadings } from './ocr-form-reading'

const line = (text: string, x: number, y = 40, confidence = 95): OcrLine => {
  let left = x
  const words = text.split(' ').map(text => { const x0 = left; left += text.length * 8 + 6; return { text, confidence, bbox: { x0, y0: y, x1: left - 6, y1: y + 14 } } })
  return { words, bbox: { x0: x, y0: y, x1: left - 6, y1: y + 14 }, baseline: { x0: x, y0: y + 12, x1: left - 6, y1: y + 12 } }
}
const text = (lines: OcrLine[]) => lines.flatMap(line => line.words.map(word => word.text)).join(' ')

it('recovers a missing company suffix without keeping two conflicting row readings', () => {
  const before = [line('CÔNG TY THƯ', 20, 40, 90), line('MẠI', 135, 40, 90)]
  const after = mergeFormReadings(before, [line('CÔNG TY THƯƠNG MẠI', 20, 40, 96)])
  expect(text(after)).toBe('CÔNG TY THƯƠNG MẠI')
  expect(text(before)).toBe('CÔNG TY THƯ MẠI')
})

it('adds a skipped amount in the far-right column without dropping the existing totals', () => {
  const before = [line('Subtotal 15.600.000', 20), line('Tax 1.248.000', 220)]
  const after = mergeFormReadings(before, [line('16.848.000', 430, 45, 96)])
  expect(text(after)).toContain('Subtotal 15.600.000')
  expect(text(after)).toContain('Tax 1.248.000')
  expect(text(after)).toContain('16.848.000')
})

it('protects a clear account number from a weak new digit sequence', () => {
  const before = [line('Account 56733649', 20, 40, 98)]
  const candidate = line('Account 567131649 Bank details', 20, 40, 96)
  candidate.words[1].confidence = 32
  const after = mergeFormReadings(before, [candidate])
  expect(text(after)).toContain('56733649')
  expect(text(after)).not.toContain('567131649')
})

it('rejects a high-score fragment and new low-score noise', () => {
  const before = [line('Company address and representative', 20)]
  const after = mergeFormReadings(before, [line('Company', 20, 40, 99), line('noise', 500, 100, 70)])
  expect(text(after)).toBe(text(before))
})

it('keeps an existing digit when a new crop reads a low-score symbol in its place', () => {
  const before = [line('Number 8', 20, 40, 70)], candidate = line('Number §', 20, 40, 96)
  candidate.words[1].confidence = 64
  expect(text(mergeFormReadings(before, [candidate]))).toBe('Number 8')
})

it('rejects a damaged amount with a letter mistaken for its final zero', () => {
  const before = [line('Tax 1248.000', 20, 40, 70)], candidate = line('Tax 1.245.00U', 20, 40, 96)
  candidate.words[1].confidence = 83
  expect(text(mergeFormReadings(before, [candidate]))).toBe('Tax 1248.000')
})

it('recovers missing leading words using aligned anchors without replacing a clear tail', () => {
  const candidate = line('The parties confirm receipt of documents today', 20, 40, 82)
  const tail = structuredClone(candidate)
  tail.words = tail.words.slice(4).map(word => ({ ...word, confidence: 98 }))
  tail.bbox.x0 = tail.words[0].bbox.x0
  candidate.words[5].text = 'docurnents'
  expect(text(mergeFormReadings([tail], [candidate]))).toBe('The parties confirm receipt of documents today')
})

it('does not recover a conflicting line merely because it has extra high-confidence words', () => {
  const original = line('approved final copy', 200, 40, 98)
  const candidate = line('The parties reject draft copies tomorrow', 20, 40, 82)
  expect(text(mergeFormReadings([original], [candidate]))).toBe('approved final copy')
})

it('keeps a nearby phone label on its own row when its tall accent overlaps an address', () => {
  const address = line('Address 325 Central Street', 20, 40, 90)
  const phone = line('Phone:', 20, 62, 85)
  phone.words[0].bbox.y0 = 51
  phone.bbox.y0 = 51
  const result = mergeFormReadings([address], [phone])
  expect(result.map(line => line.words.map(word => word.text).join(' '))).toEqual(['Address 325 Central Street', 'Phone:'])
})

it('keeps a clear accent while recovering new leading words from a slightly weaker reading', () => {
  const candidate = line('Xin đọc bạn hướng dẫn', 20, 40, 95)
  const original = structuredClone(candidate)
  original.words = original.words.slice(2).map(word => ({ ...word, confidence: 98 }))
  original.words[0].text = 'bản'
  original.bbox.x0 = original.words[0].bbox.x0
  expect(text(mergeFormReadings([original], [candidate]))).toBe('Xin đọc bản hướng dẫn')
})
