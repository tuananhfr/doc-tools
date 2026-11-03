import { expect, it } from 'vitest'
import { cleanPrintedLines, printedLineWords } from './ocr-print-lines'
import type { OcrLine, OcrWord } from './ocr-runs'

const word = (text: string, confidence: number, x: number, width = 30, height = 16): OcrWord => ({ text, confidence, bbox: { x0: x, y0: 20, x1: x + width, y1: 20 + height } })
const line = (words: OcrWord[]): OcrLine => ({ words, bbox: { x0: 10, y0: 0, x1: 500, y1: 180 }, baseline: { x0: 10, y0: 150, x1: 500, y1: 150 }, rowAttributes: { rowHeight: 130, descenders: -10 } })

it('removes malformed low-confidence noise while retaining uncertain ordinary text and numbers', () => {
  expect(printedLineWords([word('Q{~', 12, 10), word('t_~', 5, 50)])).toEqual([])
  expect(printedLineWords([word('Sơn', 18, 10), word('0940123456', 22, 50)]).map(word => word.text)).toEqual(['Sơn', '0940123456'])
  expect(printedLineWords([word('x', 95, 10), word('=', 95, 50), word('-2.50', 91, 75)]).map(word => word.text)).toEqual(['x', '=', '-2.50'])
})

it('does not let distant signature marks enlarge a printed line or destroy its font metrics', () => {
  const lines = cleanPrintedLines([line([word('ACME', 94, 10), word('LTD', 93, 50), word(',.', 0, 200, 60, 140), word('ạ', 40, 430, 10)])])
  expect(lines).toHaveLength(1)
  expect(lines[0].words.map(word => word.text)).toEqual(['ACME', 'LTD'])
  expect(lines[0].bbox).toEqual({ x0: 10, y0: 20, x1: 80, y1: 36 })
  expect(lines[0].rowAttributes!.rowHeight).toBeLessThan(20)
})

it('separates neighboring printed columns without deleting their labels', () => {
  const lines = cleanPrintedLines([line([word('Sender', 96, 10, 55), word('Receiver', 95, 280, 70)])])
  expect(lines.map(line => line.words[0].text)).toEqual(['Sender', 'Receiver'])
})

it('separates overlapping OCR rows instead of interleaving an address and a phone label', () => {
  const first = [word('Address', 96, 10, 65), word('Street', 95, 90, 55)]
  const second = [word('Phone', 94, 10, 55), word('012345', 96, 80, 60)].map(word => ({ ...word, bbox: { ...word.bbox, y0: 45, y1: 61 } }))
  expect(cleanPrintedLines([line([...first, ...second])]).map(line => line.words.map(word => word.text).join(' '))).toEqual(['Address Street', 'Phone 012345'])
})

it('removes duplicate overlapping readings, retaining genuinely repeated adjacent words', () => {
  const first = word('very', 95, 10), second = word('very', 95, 50)
  const result = cleanPrintedLines([line([first, second]), line([{ ...first }])])
  expect(result.flatMap(line => line.words.map(word => word.text))).toEqual(['very', 'very'])
})
