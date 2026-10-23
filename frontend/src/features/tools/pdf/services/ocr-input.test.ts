import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ImageSource, PageRef } from '../types/doc-tools.types'
vi.mock('./page-size', () => ({ basePageSize: async () => ({ width: 600, height: 900 }), sheetLayoutOf: async () => ({ slots: [{ x: 50, y: 75, width: 500, height: 750 }] }) }))
vi.mock('./page-preview', () => ({ renderPreview: vi.fn(), PDF_CSS_SCALE: 96 / 72 }))
vi.mock('./ocr-render-scale', () => ({ ocrRenderScale: async () => 1 }))
import { renderOcrInput } from './ocr-input'
import { renderPreview } from './page-preview'
const source: ImageSource = { id: 'photo', kind: 'image', mime: 'image/png', bytes: new Uint8Array(), name: 'photo', size: 0, pageCount: 1 }
const page: PageRef = { id: 'p', sourceId: 'photo', pageIndex: 0, rotation: 0 }
const close = vi.fn(), drawImage = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('createImageBitmap', async () => ({ width: 1200, height: 1800, close }))
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ translate: vi.fn(), rotate: vi.fn(), drawImage }) }) })
})
afterEach(() => vi.unstubAllGlobals())
it('keeps original photo pixels and maps words back to the image slot on the PDF sheet', async () => {
  const input = await renderOcrInput(source, page)
  expect([input.canvas.width, input.canvas.height]).toEqual([1200, 1800])
  expect(drawImage.mock.calls[0].slice(1)).toEqual([-600, -900, 1200, 1800])
  expect(input.pxPerPt).toBe(2.4)
  expect(input.toBase({ x: 0, y: 0 })).toEqual({ x: 50, y: 75 })
  expect(input.toBase({ x: 500, y: 750 })).toEqual({ x: 550, y: 825 })
  expect(input.toPreviewBox({ x: 0, y: 0, width: 1, height: 1 })).toEqual({ x: 50 / 600, y: 75 / 900, width: 500 / 600, height: 750 / 900 })
  expect(close).toHaveBeenCalledOnce()
})
it('preserves sheet coordinates and review crop alignment after a quarter turn', async () => {
  const input = await renderOcrInput(source, { ...page, rotation: 90 })
  expect([input.canvas.width, input.canvas.height]).toEqual([1800, 1200])
  expect(input.toBase({ x: 0, y: 0 })).toEqual({ x: 50, y: 825 })
  expect(input.toBase({ x: 750, y: 500 })).toEqual({ x: 550, y: 75 })
  expect(input.toPreviewBox({ x: 0, y: 0, width: 1, height: 1 })).toEqual({ x: 75 / 900, y: 50 / 600, width: 750 / 900, height: 500 / 600 })
})
it('keeps explicit perspective and structured profiles on the original sheet rendering path', async () => {
  vi.mocked(renderPreview).mockResolvedValueOnce({ width: 1200, height: 1800 } as HTMLCanvasElement)
  const input = await renderOcrInput(source, page, false)
  expect(input.toBase({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
  expect(input.toPreviewBox({ x: .1, y: .2, width: .3, height: .4 })).toEqual({ x: .1, y: .2, width: .3, height: .4 })
  expect(close).not.toHaveBeenCalled()
})
