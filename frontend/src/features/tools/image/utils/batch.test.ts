import { describe, expect, it } from 'vitest'
import { isResizeValue, patternProblem, renameAll, resizeTo } from './batch'

const photo = { width: 4000, height: 3000 }

describe('resizeTo', () => {
  it('giữ kích thước', () => {
    expect(resizeTo(photo, { mode: 'keep', value: 0 })).toEqual(photo)
  })

  it('thu theo cạnh dài, chiều rộng, chiều cao, phần trăm — giữ tỉ lệ', () => {
    expect(resizeTo(photo, { mode: 'edge', value: 2000 })).toEqual({ width: 2000, height: 1500 })
    expect(resizeTo({ width: 3000, height: 4000 }, { mode: 'edge', value: 2000 })).toEqual({ width: 1500, height: 2000 })
    expect(resizeTo(photo, { mode: 'width', value: 1000 })).toEqual({ width: 1000, height: 750 })
    expect(resizeTo(photo, { mode: 'height', value: 600 })).toEqual({ width: 800, height: 600 })
    expect(resizeTo(photo, { mode: 'percent', value: 25 })).toEqual({ width: 1000, height: 750 })
  })

  it('không bao giờ phóng to', () => {
    expect(resizeTo({ width: 800, height: 600 }, { mode: 'edge', value: 2000 })).toEqual({ width: 800, height: 600 })
    expect(resizeTo({ width: 800, height: 600 }, { mode: 'width', value: 800 })).toEqual({ width: 800, height: 600 })
    expect(resizeTo(photo, { mode: 'percent', value: 100 })).toEqual(photo)
  })

  it('ảnh rất dẹt không ra cạnh 0', () => {
    expect(resizeTo({ width: 5000, height: 10 }, { mode: 'width', value: 100 })).toEqual({ width: 100, height: 1 })
  })
})

describe('isResizeValue', () => {
  it('nhận số nguyên trong khoảng của từng cách', () => {
    expect(isResizeValue('keep', null)).toBe(true)
    expect(isResizeValue('edge', 1920)).toBe(true)
    expect(isResizeValue('edge', 8)).toBe(false)
    expect(isResizeValue('edge', 1920.5)).toBe(false)
    expect(isResizeValue('edge', null)).toBe(false)
    expect(isResizeValue('percent', 50)).toBe(true)
    expect(isResizeValue('percent', 150)).toBe(false)
  })
})

describe('renameAll', () => {
  it('mặc định giữ tên gốc, đổi đuôi', () => {
    expect(renameAll(['IMG_1.JPG', 'so-do.png'], ['webp', 'webp'], { pattern: '{name}', start: 1 })).toEqual(['IMG_1.webp', 'so-do.webp'])
  })

  it('đánh số có đệm 0 theo số lớn nhất của lô', () => {
    expect(renameAll(['a.jpg', 'b.jpg', 'c.jpg'], ['jpg', 'jpg', 'jpg'], { pattern: 'cong-trinh-{n}', start: 1 })).toEqual(['cong-trinh-01.jpg', 'cong-trinh-02.jpg', 'cong-trinh-03.jpg'])
    expect(renameAll(['a.jpg', 'b.jpg'], ['jpg', 'jpg'], { pattern: '{n} - {name}', start: 99 })).toEqual(['099 - a.jpg', '100 - b.jpg'])
  })

  it('tên trùng được thêm số trong ngoặc', () => {
    expect(renameAll(['a.png', 'a.jpg', 'A.webp'], ['jpg', 'jpg', 'jpg'], { pattern: '{name}', start: 1 })).toEqual(['a.jpg', 'a (2).jpg', 'A (3).jpg'])
    expect(renameAll(['a.png', 'b.png'], ['png', 'png'], { pattern: 'anh', start: 1 })).toEqual(['anh.png', 'anh (2).png'])
  })

  it('gọt ký tự không đặt tên tệp được và dấu chấm cuối', () => {
    expect(renameAll(['a.jpg'], ['jpg'], { pattern: 'Tầng 3: mặt bằng.', start: 1 })).toEqual(['Tầng 3 mặt bằng.jpg'])
    expect(renameAll(['a.jpg'], ['jpg'], { pattern: '   ', start: 1 })).toEqual(['a.jpg'])
  })
})

describe('patternProblem', () => {
  it('chấp nhận hai chỗ điền và chữ thường', () => {
    expect(patternProblem('{name}')).toBeNull()
    expect(patternProblem('anh-{n} ({name})')).toBeNull()
  })

  it('báo mẫu rỗng, ký tự cấm, chỗ điền lạ', () => {
    expect(patternProblem('  ')).toContain('Nhập mẫu')
    expect(patternProblem('a/b')).toContain('không được chứa')
    expect(patternProblem('{date}')).toContain('{name}')
  })
})
