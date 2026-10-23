import { beforeEach, expect, it, vi } from 'vitest'
import type { ImageSource, PageRef } from '../types/doc-tools.types'
vi.mock('./page-size', () => ({ imagePixelSize: vi.fn(), sheetLayoutOf: vi.fn() }))
vi.mock('./page-preview', () => ({ PDF_CSS_SCALE: 96 / 72 }))
import { imagePixelSize, sheetLayoutOf } from './page-size'
import { ocrRenderScale } from './ocr-render-scale'
const source: ImageSource = { id: 'photo', kind: 'image', mime: 'image/png', bytes: new Uint8Array(), name: 'photo', size: 0, pageCount: 1 }
const page: PageRef = { id: 'page', sourceId: 'photo', pageIndex: 0, rotation: 0 }
beforeEach(() => { vi.mocked(imagePixelSize).mockResolvedValue({ width: 1200, height: 1800 }); vi.mocked(sheetLayoutOf).mockResolvedValue({ size: { width: 600, height: 900 }, slots: [{ x: 0, y: 0, width: 600, height: 900 }] }) })
it('does not enlarge photo characters merely to manufacture 300 DPI', async () => { expect(await ocrRenderScale(source, page)).toBeCloseTo(1.5) })
it('keeps 300 DPI rendering for vector PDFs', async () => { expect(await ocrRenderScale({ ...source, kind: 'pdf', mime: 'application/pdf' }, page)).toBeCloseTo(3.125) })
it('accounts for margins rather than treating all page pixels as source photo detail', async () => { vi.mocked(sheetLayoutOf).mockResolvedValue({ size: { width: 600, height: 900 }, slots: [{ x: 50, y: 50, width: 500, height: 750 }] }); expect(await ocrRenderScale(source, page)).toBeCloseTo(1.8) })
