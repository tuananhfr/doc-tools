import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./ocr', () => ({ recognizeCanvas: vi.fn() }))
import { recognizeCanvas } from './ocr'
import { readOcrCellLines } from './ocr-cell-lines'

beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(recognizeCanvas).mockResolvedValue([])
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(),
  }) }) })
})
afterEach(() => vi.unstubAllGlobals())

it('reads each detected line independently and limits candidate canvases', async () => {
  const w = 100, h = 70, raw = new Uint8ClampedArray(w * h * 4).fill(255)
  for (const start of [12, 40]) for (let y = start; y < start + 12; y++) for (let x = 12; x < 40; x++) raw.set([0, 0, 0, 255], (y * w + x) * 4)
  const result = await readOcrCellLines(raw, w, h, new AbortController().signal)
  expect(result).toHaveLength(3)
  expect(recognizeCanvas).toHaveBeenCalledTimes(6)
  expect(vi.mocked(recognizeCanvas).mock.calls.every(call => call[4] === '7')).toBe(true)
})

it('does not read blank cells and stops at cancellation instead of starting another pass', async () => {
  const raw = new Uint8ClampedArray(100 * 70 * 4).fill(255)
  expect(await readOcrCellLines(raw, 100, 70, new AbortController().signal)).toEqual([])
  expect(recognizeCanvas).not.toHaveBeenCalled()
  for (let y = 12; y < 24; y++) for (let x = 12; x < 40; x++) raw.set([0, 0, 0, 255], (y * 100 + x) * 4)
  const controller = new AbortController(); controller.abort()
  await expect(readOcrCellLines(raw, 100, 70, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(recognizeCanvas).not.toHaveBeenCalled()
})
