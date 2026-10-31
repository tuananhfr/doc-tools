import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { OcrTable } from '../types/ocr-layout.types'
vi.mock('./ocr', () => ({ recognizeCanvas: vi.fn() }))
vi.mock('./ocr-form-rows', () => ({ readOcrFormRows: vi.fn() }))
import { recognizeCanvas } from './ocr'
import { readOcrTableSurroundings } from './ocr-table-surroundings'
import { readOcrFormRows } from './ocr-form-rows'

const table: OcrTable = { id: 't', rows: 2, columns: 1, origin: 'ruled', verifiedAt: null, cells: [{
  id: 'c', row: 0, column: 0, rowSpan: 2, columnSpan: 1, rawText: '', wordIds: [], verified: null,
  bbox: [{ x: 20, y: 40 }, { x: 180, y: 40 }, { x: 180, y: 120 }, { x: 20, y: 120 }],
}] }
const line = (text: string, confidence = 95) => [{ bbox: { x0: 68, y0: 68, x1: 188, y1: 88 }, baseline: { x0: 68, y0: 84, x1: 188, y1: 84 },
  rowAttributes: { rowHeight: 18, descenders: -2 }, words: [{ text, confidence, bbox: { x0: 68, y0: 68, x1: 188, y1: 88 } }] }]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readOcrFormRows).mockResolvedValue([])
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    fillRect: vi.fn(), drawImage: vi.fn(), putImageData: vi.fn(), setTransform: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }),
  }) }) })
})
afterEach(() => vi.unstubAllGlobals())

it('recovers the text below a table with coordinates and font metrics mapped back to the source', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Delivering representative'))
  const bands = await readOcrTableSurroundings({ width: 200, height: 300 } as HTMLCanvasElement, [table], point => point, new AbortController().signal, vi.fn())
  expect(bands).toHaveLength(1)
  expect(bands[0]).toMatchObject({ top: 122, bottom: 300 })
  expect(bands[0].lines[0]).toMatchObject({ bbox: { x0: 10, y0: 132, x1: 70, y1: 142 }, rowAttributes: { rowHeight: 9, descenders: -1 } })
  expect(bands[0].lines[0].words[0].text).toBe('Delivering representative')
  expect(vi.mocked(recognizeCanvas).mock.calls.every(call => call[4] === '6')).toBe(true)
})

it('rejects a high-confidence fragment instead of dropping the rest of a signature block', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValueOnce(line('Delivering representative company name', 80)).mockResolvedValueOnce(line('Company', 99))
  const bands = await readOcrTableSurroundings({ width: 200, height: 300 } as HTMLCanvasElement, [table], point => point, new AbortController().signal, vi.fn())
  expect(bands[0].lines[0].words[0].text).toBe('Delivering representative company name')
})

it('leaves non-table pages alone and honors cancellation before running another recognition', async () => {
  const image = { width: 200, height: 300 } as HTMLCanvasElement
  expect(await readOcrTableSurroundings(image, [], point => point, new AbortController().signal, vi.fn())).toEqual([])
  expect(recognizeCanvas).not.toHaveBeenCalled()
  const controller = new AbortController(); controller.abort()
  await expect(readOcrTableSurroundings(image, [table], point => point, controller.signal, vi.fn())).rejects.toMatchObject({ name: 'AbortError' })
})

it('extends the reading region along a sloping form edge instead of clipping the totals to the table width', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue(line('Total tax and payment'))
  const sloping = structuredClone(table)
  sloping.cells[0].bbox[1].x = 200; sloping.cells[0].bbox[2].x = 220
  await readOcrTableSurroundings({ width: 800, height: 600 } as HTMLCanvasElement, [sloping], point => point, new AbortController().signal, vi.fn())
  const bounds = vi.mocked(readOcrFormRows).mock.calls[0][1]
  expect(bounds.top).toBe(122)
  expect(bounds.right).toBeGreaterThan(300)
  expect(bounds.right).toBeLessThanOrEqual(800)
})
