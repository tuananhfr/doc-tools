import { describe, expect, it } from 'vitest'
import { stem, uniqueName, uniqueNames } from './file-names'

describe('stem', () => {
  it('bỏ đuôi, giữ tên không có đuôi', () => {
    expect(stem('Biên bản nghiệm thu.JPEG')).toBe('Biên bản nghiệm thu')
    expect(stem('anh-chup')).toBe('anh-chup')
    expect(stem('.png')).toBe('')
  })
})

describe('uniqueNames', () => {
  it('đánh số tên trùng, không phân biệt hoa thường', () => {
    expect(uniqueNames(['a.webp', 'A.webp', 'b.webp', 'a.webp'])).toEqual(['a.webp', 'A (2).webp', 'b.webp', 'a (3).webp'])
  })

  it('không đụng tên đã khác nhau, và đánh số được tên không có đuôi', () => {
    expect(uniqueNames(['a.jpg', 'a.png'])).toEqual(['a.jpg', 'a.png'])
    expect(uniqueNames(['README', 'README'])).toEqual(['README', 'README (2)'])
  })
})

describe('uniqueName', () => {
  it('nhớ tên đã cấp qua nhiều lần gọi', () => {
    const used = new Set<string>()
    expect(uniqueName('trang.jpg', used)).toBe('trang.jpg')
    expect(uniqueName('TRANG.jpg', used)).toBe('TRANG (2).jpg')
    expect(uniqueName('trang (2).jpg', used)).toBe('trang (2) (2).jpg')
  })
})
