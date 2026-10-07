import { afterEach, describe, expect, it } from 'vitest'
import { clearOcrTexts, copyOcrTexts, ocrText, saveOcrText } from './ocr-store'
import type { PageRef } from '../types/doc-tools.types'

afterEach(clearOcrTexts)
describe('OCR memory cache', () => {
  it('does not reuse a text layer on a newly rotated source page', () => {
    const page = { pageIndex: 0, rotation: 0 } as PageRef
    const text = { runs: [] }
    saveOcrText('s', page, text)
    expect(ocrText('s', page)).toBe(text)
    expect(ocrText('s', { ...page, rotation: 90 })).toBeUndefined()
    copyOcrTexts('s', 'clone')
    expect(ocrText('clone', page)).toBe(text)
  })
})
