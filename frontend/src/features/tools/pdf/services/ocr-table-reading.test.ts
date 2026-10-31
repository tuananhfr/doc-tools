import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { OcrTable } from '../types/ocr-layout.types'
vi.mock('./ocr', () => ({ recognizeCanvas: vi.fn() }))
vi.mock('./ocr-cell-lines', () => ({ readOcrCellLines: vi.fn() }))
import { recognizeCanvas } from './ocr'
import { readOcrCellLines } from './ocr-cell-lines'
import { readOcrTableCells } from './ocr-table-reading'

const table = (): OcrTable => ({ id: 't', rows: 2, columns: 2, origin: 'ruled', verifiedAt: null, cells: [{ id: 'c', row: 0, column: 0, rowSpan: 1, columnSpan: 1, rawText: 'old', wordIds: [], verified: null, bbox: [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 60 }, { x: 10, y: 60 }] }] })
const line = (text: string) => [{ bbox: { x0: 20, y0: 20, x1: 60, y1: 40 }, baseline: { x0: 20, y0: 35, x1: 60, y1: 35 }, words: [{ text, confidence: 95, bbox: { x0: 20, y0: 20, x1: 60, y1: 40 } }] }]
let ink = true
beforeEach(() => {
  vi.resetAllMocks(); ink = true
  vi.mocked(readOcrCellLines).mockResolvedValue([])
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), fillRect: vi.fn(), drawImage: vi.fn(), putImageData: vi.fn(), getImageData: (_x: number, _y: number, w: number, h: number) => {
    const data = new Uint8ClampedArray(w * h * 4).fill(255)
    if (ink) for (let y = 10; y < Math.min(h, 20); y++) for (let x = 10; x < Math.min(w, 35); x++) { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = 30 }
    return { data }
  } }) }) })
})
afterEach(() => vi.unstubAllGlobals())
it('reads a cell separately and preserves unverified source metadata without mutating it', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue(line('120.000'))
  const original = table(), signal = new AbortController().signal
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [original], point => point, signal, vi.fn())
  expect(result[0].cells[0]).toMatchObject({ rawText: '120.000', verified: null, rowSpan: 1, columnSpan: 1 })
  expect(original.cells[0].rawText).toBe('old')
  expect(vi.mocked(recognizeCanvas).mock.calls[0][4]).toBe('6')
})
it('preserves genuinely blank cells instead of restoring noise from the whole-page pass', async () => {
  ink = false
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [table()], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[0].rawText).toBe('')
  expect(recognizeCanvas).not.toHaveBeenCalled()
})
it('retries an ink-bearing empty reading as a single line, then honors cancellation', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue(line('1')).mockResolvedValueOnce([])
  const source = table(); source.cells[0].rawText = ''
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[0].rawText).toBe('1')
  expect(vi.mocked(recognizeCanvas).mock.calls[1][4]).toBe('7')
  const controller = new AbortController(); controller.abort()
  await expect(readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [table()], point => point, controller.signal, vi.fn())).rejects.toMatchObject({ name: 'AbortError' })
})
it('keeps the fuller original reading when a cell retry produces a fragment or only ruling punctuation', async () => {
  const source = table(); source.cells[0].rawText = 'Mã số: LPC.TVTK01.001'
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Mã'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[0].rawText).toBe('Mã số: LPC.TVTK01.001')
})
it('uses numeric recognition below an explicit quantity header without guessing values', async () => {
  const source = table(), header = { ...source.cells[0], id: 'header', rawText: 'Số lượng' }
  source.cells = [header, { ...source.cells[0], row: 1, id: 'value', rawText: '0i' }]
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, numeric) => line(numeric ? '01' : 'Số lượng'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[1].rawText).toBe('01')
  const numericCall = vi.mocked(recognizeCanvas).mock.calls.find(call => call[2])!
  expect(numericCall[4]).toBe('7')
})

it('does not replace a confident quantity with a conflicting crop reading', async () => {
  const source = table(), header = { ...source.cells[0], id: 'header', rawText: 'Số lượng' }
  source.cells = [header, { ...source.cells[0], row: 1, id: 'value', rawText: '100', wordIds: ['number'] }]
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, numeric) => line(numeric ? '109' : 'Số lượng'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn(), [{ id: 'number', rawText: '100', confidence: 98 }])
  expect(result[0].cells[1].rawText).toBe('100')
})

it('preserves the operators in an invoice formula row below a numeric heading', async () => {
  const source = table(), header = { ...source.cells[0], id: 'header', rawText: 'Thành tiền' }
  source.cells = [header, { ...source.cells[0], row: 1, id: 'formula', rawText: '6=4x5' }]
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, numeric) => line(numeric ? '645' : '6=4x5'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[1].rawText).toBe('6=4x5')
  expect(vi.mocked(recognizeCanvas).mock.calls.every(call => !call[2])).toBe(true)
})

it('keeps a confident existing cell when re-reading introduces new spelling errors', async () => {
  const source = table(); source.cells[0].rawText = 'Bảng xác định khối lượng hoàn thành đợt 2'; source.cells[0].wordIds = ['original']
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Bảng xác định khỏi lượng hoàn thánh đợt 2'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn(), [{ id: 'original', rawText: source.cells[0].rawText, confidence: 99 }])
  expect(result[0].cells[0].rawText).toBe(source.cells[0].rawText)
})

it('does not replace an existing document code with a reading that changes its digits', async () => {
  const source = table(); source.cells[0].rawText = 'Mã số: LPC.TVTK01.001'
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Mã số LPC.TV UROT 001'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[0].rawText).toBe('Mã số: LPC.TVTK01.001')
})

it('uses separate line readings to recover a skipped heading instead of keeping the high-score fragment', async () => {
  const source = table(); source.cells[0].rawText = 'CHÚ'; source.cells[0].wordIds = ['original']
  vi.mocked(recognizeCanvas).mockResolvedValue(line('CHÚ'))
  vi.mocked(readOcrCellLines).mockResolvedValue([[...line('GHI'), ...line('CHÚ')]])
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn(), [{ id: 'original', rawText: 'CHÚ', confidence: 99 }])
  expect(result[0].cells[0].rawText).toBe('GHI\nCHÚ')
})

it('does not treat repeated omission of a date as numeric agreement', async () => {
  const source = table(); source.cells[0].rawText = 'Nội dung văn bản dài cần lưu ngày 27/3/2023'
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Nội dung văn bản dài cần lưu ngày'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn())
  expect(result[0].cells[0].rawText).toBe(source.cells[0].rawText)
})

it('recovers a missing line in a heading even when the remaining line has a high score', async () => {
  const source = table(); source.cells[0].rawText = 'CHÚ'; source.cells[0].wordIds = ['original']
  vi.mocked(recognizeCanvas).mockResolvedValue([...line('GHI'), ...line('CHÚ')])
    .mockResolvedValueOnce(line('CHÚ')).mockResolvedValueOnce(line('CHÚ')).mockResolvedValueOnce(line('CHÚ'))
  const result = await readOcrTableCells({ width: 400, height: 500 } as HTMLCanvasElement, [source], point => point, new AbortController().signal, vi.fn(), [{ id: 'original', rawText: 'CHÚ', confidence: 99 }])
  expect(result[0].cells[0].rawText).toBe('GHI\nCHÚ')
})
