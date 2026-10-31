import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('./ocr-orientation', () => ({ detectOcrOrientation: vi.fn() }))
vi.mock('./ocr', () => ({ stopOcr: vi.fn() }))
vi.mock('./ocr-preprocess', () => ({ sampledGray: () => ({ width: 1, height: 1, data: new Uint8Array([255]) }) }))
vi.mock('../utils/scan-paper', () => ({ detectScanCorners: vi.fn(() => null) }))
vi.mock('../utils/scan-analysis', () => ({ estimateSkew: () => 0 }))
vi.mock('../utils/ocr-quality', () => ({ ocrQuality: () => [] }))
import { autoScanDocument } from './document-scan'
import { detectOcrOrientation } from './ocr-orientation'
import { stopOcr } from './ocr'
import type { QuickItem } from '../hooks/useQuickSources'

const item = (): QuickItem => ({ source: { id: 'photo', kind: 'image', name: 'photo.jpg', mime: 'image/jpeg', bytes: new Uint8Array([1]), size: 1, pageCount: 1 }, pages: [{ id: 'page', sourceId: 'photo', pageIndex: 0, rotation: 0 }] })
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(detectOcrOrientation).mockResolvedValue(0)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 24, height: 32, close: vi.fn() })))
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
    toBlob: (callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array([2, 3])], { type: 'image/png' })),
    getContext: () => ({ drawImage: vi.fn(), fillRect: vi.fn(), setTransform: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }),
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn(),
    }),
  }) })
})
afterEach(() => vi.unstubAllGlobals())

it('turns a sideways photo even when no crop border can be detected', async () => {
  vi.mocked(detectOcrOrientation).mockResolvedValue(90)
  const original = item(), controller = new AbortController()
  const result = await autoScanDocument(original, controller.signal)
  expect(result?.options.rotation).toBe(90)
  expect(result?.item.source).toMatchObject({ originId: 'photo', mime: 'image/png', name: 'photo.jpg' })
  expect(result?.item.source.id).not.toBe('photo')
  expect(original.source).toMatchObject({ bytes: new Uint8Array([1]) })
  expect(original.pages[0].rotation).toBe(0)
  controller.abort(); expect(stopOcr).not.toHaveBeenCalled()
})

it('keeps an upright uncropped photo and preserves image PDF fallback if the model fails', async () => {
  expect(await autoScanDocument(item(), new AbortController().signal)).toBeNull()
  vi.mocked(detectOcrOrientation).mockRejectedValue(new Error('MODEL_UNAVAILABLE'))
  expect(await autoScanDocument(item(), new AbortController().signal)).toBeNull()
})

it('terminates pending orientation work when the upload is cancelled', async () => {
  const controller = new AbortController()
  vi.mocked(detectOcrOrientation).mockImplementation(async () => { controller.abort(); return 90 })
  await expect(autoScanDocument(item(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(stopOcr).toHaveBeenCalledTimes(1)
})
