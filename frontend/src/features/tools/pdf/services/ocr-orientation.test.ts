import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./ocr', () => ({ recognizeCanvas: vi.fn() }))
import { recognizeCanvas } from './ocr'
import { detectOcrOrientation } from './ocr-orientation'
import type { OcrLine } from '../utils/ocr-runs'

let probes: { width: number; height: number }[]
const readable = (repeat = 1): OcrLine[] => [{ bbox: { x0: 0, y0: 0, x1: 800, y1: 30 }, baseline: { x0: 0, y0: 25, x1: 800, y1: 25 },
  words: ('HÓA ĐƠN GIÁ TRỊ GIA TĂNG CÔNG TY THƯƠNG MẠI DỊCH VỤ '.repeat(repeat)).trim().split(' ').map(text => ({ text, confidence: 96, bbox: { x0: 0, y0: 0, x1: 40, y1: 24 } })),
}]
beforeEach(() => {
  vi.resetAllMocks(); probes = []
  vi.stubGlobal('document', { createElement: () => { const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn() }) }; probes.push(canvas); return canvas } })
})
afterEach(() => vi.unstubAllGlobals())

it('compares four thumbnail directions and frees them without changing original pixels', async () => {
  const source = { width: 2400, height: 1800 } as HTMLCanvasElement, sizes: number[][] = []
  vi.mocked(recognizeCanvas).mockImplementation(async canvas => { sizes.push([canvas.width, canvas.height]); return sizes.length === 2 ? readable() : [] })
  expect(await detectOcrOrientation(source, new AbortController().signal)).toBe(90)
  expect(sizes).toEqual([[1200, 900], [900, 1200], [900, 1200], [1200, 900]])
  expect(probes[0]).toMatchObject({ width: 1, height: 1 })
  expect(source).toMatchObject({ width: 2400, height: 1800 })
})

it('leaves a real landscape document upright and skips unnecessary comparisons', async () => {
  vi.mocked(recognizeCanvas).mockResolvedValue(readable(4))
  expect(await detectOcrOrientation({ width: 1200, height: 800 } as HTMLCanvasElement, new AbortController().signal)).toBe(0)
  expect(recognizeCanvas).toHaveBeenCalledTimes(1)
})

it('honors cancellation between probes and propagates a model failure for the caller fallback', async () => {
  const source = { width: 1200, height: 800 } as HTMLCanvasElement, controller = new AbortController()
  vi.mocked(recognizeCanvas).mockImplementation(async () => { controller.abort(); return [] })
  await expect(detectOcrOrientation(source, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(recognizeCanvas).toHaveBeenCalledTimes(1)
  expect(probes[0]).toMatchObject({ width: 1, height: 1 })
  vi.mocked(recognizeCanvas).mockRejectedValue(new Error('MODEL_UNAVAILABLE'))
  await expect(detectOcrOrientation(source, new AbortController().signal)).rejects.toThrow('MODEL_UNAVAILABLE')
})
