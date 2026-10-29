import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { OcrLine } from '../utils/ocr-runs'
vi.mock('./ocr', () => ({ recognizeCanvas: vi.fn() }))
import { recognizeCanvas } from './ocr'
import { recognizeLocalPrint } from './ocr-local'

const line = (text: string, confidence: number, x = 100, y = 120): OcrLine => ({
  bbox: { x0: x, y0: y, x1: x + 200, y1: y + 20 }, baseline: { x0: x, y0: y + 16, x1: x + 200, y1: y + 16 },
  words: [{ text, confidence, bbox: { x0: x, y0: y, x1: x + 200, y1: y + 20 } }],
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), putImageData: vi.fn(), getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4).fill(255) }) }) }) })
})
afterEach(() => vi.unstubAllGlobals())
it('detects layout in the upper photo band without extra recognition passes', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue([line('Dòng chữ rõ ràng', 95)])
  const result = await recognizeLocalPrint({ width: 600, height: 600 } as HTMLCanvasElement, vi.fn(), new AbortController().signal)
  expect(vi.mocked(recognizeCanvas).mock.calls[0][4]).toBe('3')
  expect(vi.mocked(recognizeCanvas).mock.calls.slice(1).every(call => call[4] === '6')).toBe(true)
  expect(recognizeCanvas).toHaveBeenCalledTimes(result.regions.length)
})
it('re-reads a weak line as one line and maps its words back into the original image', async () => {
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, _numeric, _signal, mode) => [mode === '7' ? line('Thông tin chính', 95, 16, 16) : line('Thông tin chinh', 60)])
  const original = { width: 600, height: 600 } as HTMLCanvasElement
  const result = await recognizeLocalPrint(original, vi.fn(), new AbortController().signal)
  expect(result.lines.length).toBeGreaterThan(0)
  expect(result.lines.every(line => line.words[0].text === 'Thông tin chính')).toBe(true)
  expect(result.lines.every(line => line.bbox.x0 >= 0 && line.bbox.y0 >= 0 && line.bbox.x1 <= 600 && line.bbox.y1 <= 600)).toBe(true)
  expect(result.regions.length).toBeGreaterThan(1)
  expect([original.width, original.height]).toEqual([600, 600])
})
it('does not replace a weak complete line with a high-confidence fragment', async () => {
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, _numeric, _signal, mode) => [mode === '7' ? line('Thông', 99, 16, 16) : line('Thông tin chinh', 60)])
  const result = await recognizeLocalPrint({ width: 600, height: 600 } as HTMLCanvasElement, vi.fn(), new AbortController().signal)
  expect(result.lines.every(line => line.words[0].text === 'Thông tin chinh')).toBe(true)
})
it('honours cancellation before starting any recognition job', async () => {
  const abort = new AbortController(); abort.abort()
  await expect(recognizeLocalPrint({ width: 600, height: 600 } as HTMLCanvasElement, vi.fn(), abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(recognizeCanvas).not.toHaveBeenCalled()
})
it('keeps a clear context line when its owning strip misses it, without duplicating it', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue([line('Dòng ngữ cảnh được đọc đầy đủ', 95, 100, 250)])
  const result = await recognizeLocalPrint({ width: 600, height: 600 } as HTMLCanvasElement, vi.fn(), new AbortController().signal)
  // The first crop sees this line beyond its normal ownership boundary.
  expect(result.lines.some(value => value.bbox.y0 === 203)).toBe(true)
})
it('does not substitute a different year merely because the retry has a higher confidence', async () => {
  vi.mocked(recognizeCanvas).mockImplementation(async (_canvas, _progress, _numeric, _signal, mode) => [mode === '7' ? line('Năm 1920', 99, 16, 16) : line('Năm 1911 còn đây', 60)])
  const result = await recognizeLocalPrint({ width: 600, height: 600 } as HTMLCanvasElement, vi.fn(), new AbortController().signal)
  expect(result.lines.every(line => line.words[0].text === 'Năm 1911 còn đây')).toBe(true)
})
