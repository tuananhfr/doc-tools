import { beforeEach, expect, it, vi } from 'vitest'
import type { FlowResult } from '@/features/tools/hub'
import { DEFAULT_SHEET } from '../utils/image-sheet'
vi.mock('./ocr-text-pdf', () => ({ buildOcrTextPdf: vi.fn() }))
import { buildOcrTextPdf } from './ocr-text-pdf'
import { editOcrTextPdf } from './ocr-text-edit'
const original: FlowResult = { title: 'PDF', output: { name: 'OCR.pdf', blob: new Blob(['original']) }, text: 'Thành phản\n\nTrang 2', textPages: ['Thành phản', 'Trang 2'], notes: [{ tone: 'warning', text: 'Check OCR' }] }
beforeEach(() => { vi.clearAllMocks() })
it('updates the downloadable PDF and text together, preserves input-page boundaries and leaves the raw result intact', async () => {
  const blob = new Blob(['new PDF'], { type: 'application/pdf' })
  vi.mocked(buildOcrTextPdf).mockResolvedValueOnce({ blob, pages: 2 })
  const signal = new AbortController().signal, pages = ['Thành phần', 'Trang 2 đã sửa']
  const result = await editOcrTextPdf(original, pages, DEFAULT_SHEET, signal)
  expect(buildOcrTextPdf).toHaveBeenCalledWith(pages, DEFAULT_SHEET, signal)
  expect(result.output.blob).toBe(blob)
  expect(result.text).toBe('Thành phần\n\nTrang 2 đã sửa')
  expect(result.textPages).toEqual(pages)
  expect(result.notes).toEqual(original.notes)
  expect(original.text).toContain('Thành phản')
  expect(result.output.name).toBe('OCR.pdf')
})
it('rejects an empty edit without producing a blank PDF', async () => {
  await expect(editOcrTextPdf(original, ['  '], DEFAULT_SHEET, new AbortController().signal)).rejects.toThrow()
  expect(buildOcrTextPdf).not.toHaveBeenCalled()
})
it('does not replace the current result after an export failure or cancellation', async () => {
  vi.mocked(buildOcrTextPdf).mockRejectedValueOnce(new Error('failed'))
  await expect(editOcrTextPdf(original, ['Thành phần'], DEFAULT_SHEET, new AbortController().signal)).rejects.toThrow('failed')
  const abort = new AbortController()
  vi.mocked(buildOcrTextPdf).mockImplementationOnce(async () => { abort.abort(); return { blob: new Blob(['cancelled']), pages: 1 } })
  await expect(editOcrTextPdf(original, ['Thành phần'], DEFAULT_SHEET, abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(original.output.blob.size).toBe(8)
})
