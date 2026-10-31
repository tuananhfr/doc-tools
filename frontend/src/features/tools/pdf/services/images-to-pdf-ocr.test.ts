import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuickItem } from '../hooks/useQuickSources'
import type { FlowStep } from '@/features/tools/hub'
import { DEFAULT_OCR_OPTIONS } from '../types/ocr-profile.types'
import { DEFAULT_SHEET } from '../utils/image-sheet'

vi.mock('./doc-build', () => ({ buildPdf: vi.fn(), buildBatch: vi.fn(), buildImages: vi.fn(), buildOffice: vi.fn(), buildSplit: vi.fn() }))
vi.mock('./ocr', () => ({ recognizePage: vi.fn(), stopOcr: vi.fn() }))
vi.mock('./ocr-pipeline', () => ({ recognizePipeline: vi.fn(), ocrFingerprint: () => 'recipe' }))
vi.mock('./ocr-quality', () => ({ ocrSourceHash: async () => 'source-hash' }))
vi.mock('./ocr-export', () => ({ exportReviewedOcr: vi.fn(), reviewedOcrText: vi.fn() }))
vi.mock('./text-layer', () => ({ loadPageText: async () => ({ runs: [] }) }))
vi.mock('./ocr-text-pdf', () => ({ buildOcrTextPdf: vi.fn() }))
vi.mock('./page-size', () => ({ basePageSize: async () => ({ width: 595.28, height: 841.89 }) }))
vi.mock('./ocr-document-pdf', () => ({ buildOcrDocumentPdf: vi.fn() }))

import { imagesToPdfTask } from './quick-tasks'
import { buildPdf, buildBatch } from './doc-build'
import { recognizePipeline } from './ocr-pipeline'
import { clearOcrTexts, ocrText, saveOcrText } from './ocr-store'
import { buildOcrTextPdf } from './ocr-text-pdf'
import { buildOcrDocumentPdf } from './ocr-document-pdf'

const item = (id: string): QuickItem => ({ source: { id, kind: 'image', name: `${id}.png`, mime: 'image/png', bytes: new Uint8Array([1]), size: 1, pageCount: 1 }, pages: [{ id: `page-${id}`, sourceId: id, pageIndex: 0, rotation: 0 }] })
const text = () => ({ runs: [{ text: 'Nội dung', origin: { x: 20, y: 30 }, width: 80, size: 12, angle: 0, ascent: .8, descent: -.2, fontName: 'test', fontFamily: 'sans-serif', eol: true }] })
const step = (signal = new AbortController().signal): FlowStep => ({ signal, onProgress: vi.fn() })

beforeEach(() => {
  vi.clearAllMocks(); clearOcrTexts()
  vi.mocked(recognizePipeline).mockResolvedValue(text())
  vi.mocked(buildPdf).mockResolvedValue({ file: { name: 'combined.pdf', blob: new Blob(['pdf'], { type: 'application/pdf' }) }, carryover: {} } as Awaited<ReturnType<typeof buildPdf>>)
})

describe('OCR integrated with the image-to-PDF flow', () => {
  it('keeps a table-only reading when the whole-page pass missed every word', async () => {
    vi.mocked(recognizePipeline).mockResolvedValueOnce({ runs: [], ocr: { sourceId: 'table', pageIndex: 0, sourceHash: null, engine: 'tesseract', engineVersion: 'test', pass: 'original', words: [], qualityFlags: [], layout: { regions: [], fields: [], tables: [{ id: 't', rows: 2, columns: 2, origin: 'ruled', verifiedAt: null, cells: [{ id: 'c', row: 0, column: 0, rowSpan: 2, columnSpan: 2, bbox: [{ x: 20, y: 20 }, { x: 200, y: 20 }, { x: 200, y: 200 }, { x: 20, y: 200 }], rawText: '120.000', wordIds: [], verified: null }] }] } } })
    vi.mocked(buildOcrDocumentPdf).mockResolvedValueOnce({ blob: new Blob(['structured']), pages: 1 })
    const result = await imagesToPdfTask([item('table')], DEFAULT_SHEET, { options: DEFAULT_OCR_OPTIONS, layout: 'text' })(step())
    expect(result.text).toContain('120.000')
    expect(result.ocrDocument?.pages[0].blocks[0].kind).toBe('table')
    expect(buildPdf).not.toHaveBeenCalled()
  })
  it('white-page mode uses recognized text and does not invoke the photo PDF assembler', async () => {
    vi.mocked(buildOcrTextPdf).mockResolvedValueOnce({ blob: new Blob(['text pdf'], { type: 'application/pdf' }), pages: 2 })
    const result = await imagesToPdfTask([item('one'), item('two')], DEFAULT_SHEET, { options: DEFAULT_OCR_OPTIONS, layout: 'text' })(step())
    expect(buildOcrTextPdf).toHaveBeenCalledWith(['Nội dung', 'Nội dung'], DEFAULT_SHEET, expect.any(AbortSignal))
    expect(buildPdf).not.toHaveBeenCalled()
    expect(result.text).toBe('Nội dung\n\nNội dung')
    expect(result.textPages).toEqual(['Nội dung', 'Nội dung'])
  })
  it('exports recognized text immediately without mandatory review or fabricated verification', async () => {
    const items = [item('source')]
    const result = await imagesToPdfTask(items, DEFAULT_SHEET, { options: DEFAULT_OCR_OPTIONS })(step())
    expect(buildPdf).toHaveBeenCalledOnce()
    const page = vi.mocked(buildPdf).mock.calls[0][1][0]
    expect(ocrText('source', page)?.runs[0].text).toBe('Nội dung')
    expect(result.notes.some(note => note.tone === 'warning')).toBe(true)
  })
  it('recognizes processed sources with the selected sheet, reviews, then builds ONE PDF in order', async () => {
    const items = [item('scan-2'), item('scan-1')], sheet = { paper: 'a3' as const, margin: 20 as const }
    const review = vi.fn(async (prepared: QuickItem[]) => {
      expect(buildPdf).not.toHaveBeenCalled()
      expect(prepared.map(i => i.source.id)).toEqual(['scan-2', 'scan-1'])
      expect(prepared[0].pages[0].sheet).toEqual(sheet)
      expect(ocrText('scan-2', prepared[0].pages[0])?.runs[0].text).toBe('Nội dung')
    })
    const result = await imagesToPdfTask(items, sheet, { review, options: DEFAULT_OCR_OPTIONS })(step())
    expect(review).toHaveBeenCalledOnce(); expect(recognizePipeline).toHaveBeenCalledTimes(2)
    expect(buildPdf).toHaveBeenCalledOnce(); expect(buildBatch).not.toHaveBeenCalled()
    expect(vi.mocked(buildPdf).mock.calls[0][1].map(page => page.sourceId)).toEqual(['scan-2', 'scan-1'])
    expect(result.output.blob.type).toBe('application/pdf')
    expect(items[0].pages[0].sheet).toBeUndefined()
  })
  it('plain export never includes a cached OCR layer from a previous attempt', async () => {
    const original = item('source'); saveOcrText('source', { ...original.pages[0], sheet: DEFAULT_SHEET }, text())
    await imagesToPdfTask([original], DEFAULT_SHEET)(step())
    const [context, pages] = vi.mocked(buildPdf).mock.calls[0]
    expect(pages[0].sourceId).not.toBe('source')
    expect(ocrText(pages[0].sourceId, pages[0])).toBeUndefined()
    const exported = context.sources[pages[0].sourceId]
    if (exported.kind !== 'image' || original.source.kind !== 'image') throw new Error('Expected image inputs')
    expect(exported.bytes).toBe(original.source.bytes)
    expect(recognizePipeline).not.toHaveBeenCalled()
  })
  it('OCR model failure does not mutate inputs or prevent the user from creating an image PDF', async () => {
    const items = [item('source')], review = vi.fn()
    vi.mocked(recognizePipeline).mockRejectedValueOnce(new Error('MODEL_UNAVAILABLE'))
    await expect(imagesToPdfTask(items, DEFAULT_SHEET, { review, options: DEFAULT_OCR_OPTIONS })(step())).rejects.toThrow('MODEL_UNAVAILABLE')
    expect(buildPdf).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled()
    await imagesToPdfTask(items, DEFAULT_SHEET)(step())
    expect(buildPdf).toHaveBeenCalledOnce(); expect(items[0].source.id).toBe('source')
  })
  it('cancelling during review never exports an unreviewed searchable PDF', async () => {
    const abort = new AbortController()
    await expect(imagesToPdfTask([item('source')], DEFAULT_SHEET, { review: async () => { abort.abort() }, options: DEFAULT_OCR_OPTIONS })(step(abort.signal))).rejects.toMatchObject({ name: 'AbortError' })
    expect(buildPdf).not.toHaveBeenCalled()
  })
  it('does not label a PDF searchable when recognition returns no text', async () => {
    vi.mocked(recognizePipeline).mockResolvedValueOnce({ ...text(), runs: [] })
    const review = vi.fn()
    await expect(imagesToPdfTask([item('blank')], DEFAULT_SHEET, { review, options: DEFAULT_OCR_OPTIONS })(step())).rejects.toThrow()
    expect(review).not.toHaveBeenCalled(); expect(buildPdf).not.toHaveBeenCalled()
  })
})
