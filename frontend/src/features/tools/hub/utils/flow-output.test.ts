import { describe, expect, it } from 'vitest'
import { canPreview, extensionOf, outputIcon } from './flow-output'

describe('extensionOf', () => {
  it('lấy đuôi cuối cùng, chữ thường', () => {
    expect(extensionOf('hop-dong - đã ghép.PDF')).toBe('pdf')
    expect(extensionOf('bao-cao.v2.docx')).toBe('docx')
  })

  it('không có đuôi thì rỗng — tên bắt đầu bằng dấu chấm không tính là đuôi', () => {
    expect(extensionOf('tai-lieu')).toBe('')
    expect(extensionOf('.gitignore')).toBe('')
  })
})

describe('outputIcon', () => {
  it('chọn icon theo đuôi, đuôi lạ dùng icon tệp chung', () => {
    expect(outputIcon('a.pdf')).toBe('file-earmark-pdf')
    expect(outputIcon('a - đã tách.zip')).toBe('file-earmark-zip')
    expect(outputIcon('a.xlsx')).toBe('file-earmark-excel')
    expect(outputIcon('a.bin')).toBe('file-earmark')
  })
})

describe('canPreview', () => {
  it('chỉ nhận loại trình duyệt tự mở được', () => {
    expect(canPreview('application/pdf')).toBe(true)
    expect(canPreview('image/jpeg')).toBe(true)
    expect(canPreview('text/plain;charset=utf-8')).toBe(true)
    expect(canPreview('application/zip')).toBe(false)
    expect(canPreview('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
    expect(canPreview('')).toBe(false)
  })
})
