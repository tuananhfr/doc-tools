import { describe, expect, it } from 'vitest'
import { fitWithin, outputName, sizeLabel } from './image-format'

describe('outputName', () => {
  it('đổi đuôi theo định dạng ra, giữ dấu tiếng Việt', () => {
    expect(outputName('Biên bản nghiệm thu.JPEG', 'webp')).toBe('Biên bản nghiệm thu.webp')
    expect(outputName('IMG_0012.png', 'jpeg', 'đã nén')).toBe('IMG_0012 - đã nén.jpg')
  })

  it('tên không có đuôi hoặc chỉ có đuôi', () => {
    expect(outputName('anh-chup', 'jpeg')).toBe('anh-chup.jpg')
    expect(outputName('.png', 'png')).toBe('anh.png')
  })
})

describe('fitWithin', () => {
  it('thu theo cạnh dài, giữ tỉ lệ', () => {
    expect(fitWithin({ width: 4032, height: 3024 }, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWithin({ width: 3024, height: 4032 }, 1920)).toEqual({ width: 1440, height: 1920 })
  })

  it('không phóng to ảnh nhỏ hơn trần, và null = giữ nguyên', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1920)).toEqual({ width: 800, height: 600 })
    expect(fitWithin({ width: 8000, height: 6000 }, null)).toEqual({ width: 8000, height: 6000 })
  })

  it('ảnh dải rất hẹp không bị thu về 0', () => {
    expect(fitWithin({ width: 10000, height: 2 }, 100)).toEqual({ width: 100, height: 1 })
  })
})

describe('sizeLabel', () => {
  it('ghi liền số', () => {
    expect(sizeLabel({ width: 4032, height: 3024 })).toBe('4032 × 3024 px')
  })
})
