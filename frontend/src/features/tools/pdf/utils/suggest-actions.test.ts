import { describe, expect, it } from 'vitest'
import { suggestActions } from './suggest-actions'

const ids = (input: Parameters<typeof suggestActions>[0]) => suggestActions(input).map((item) => item.id)

describe('suggestActions', () => {
  it('nhiều PDF → ghép đứng đầu', () => {
    expect(ids({ pdfFiles: 3, imageFiles: 0, pageCount: 12 })).toEqual(['merge', 'pdf-to-word', 'pdf-to-image'])
  })

  it('một PDF nhiều trang → tách, không gợi ý ghép', () => {
    expect(ids({ pdfFiles: 1, imageFiles: 0, pageCount: 20 })).toEqual(['split', 'pdf-to-word', 'pdf-to-image'])
  })

  it('một PDF một trang → không gợi ý tách', () => {
    expect(ids({ pdfFiles: 1, imageFiles: 0, pageCount: 1 })).toEqual(['pdf-to-word', 'pdf-to-image'])
  })

  it('chỉ ảnh → ảnh thành PDF, không có việc chỉ dành cho PDF', () => {
    const [first] = suggestActions({ pdfFiles: 0, imageFiles: 4, pageCount: 4 })
    expect(first).toMatchObject({ id: 'image-to-pdf', label: 'Tải 4 ảnh thành 1 PDF' })
    expect(ids({ pdfFiles: 0, imageFiles: 1, pageCount: 1 })).toEqual(['image-to-pdf'])
  })

  it('PDF lẫn ảnh → ghép', () => {
    expect(ids({ pdfFiles: 1, imageFiles: 2, pageCount: 5 })[0]).toBe('merge')
  })
})
