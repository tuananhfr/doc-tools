import { describe, expect, it } from 'vitest'
import { addStats, classifyImage, compressionSummary, formatBytes, scaledSize, sizeChange, type ImageInfo } from './compression'

const JPEG: ImageInfo = {
  filters: ['DCTDecode'],
  colorSpace: 'DeviceRGB',
  bitsPerComponent: 8,
  imageMask: false,
  hasMask: false,
  hasDecode: false,
  bytes: 500_000,
}

describe('classifyImage', () => {
  it('recompresses plain RGB, gray and 1/3-channel ICC JPEGs', () => {
    expect(classifyImage(JPEG)).toBe('recompress')
    expect(classifyImage({ ...JPEG, colorSpace: 'DeviceGray' })).toBe('recompress')
    expect(classifyImage({ ...JPEG, colorSpace: 'ICCBased', iccChannels: 3 })).toBe('recompress')
  })

  it('leaves CMYK, masked, inverted and tiny JPEGs alone', () => {
    expect(classifyImage({ ...JPEG, colorSpace: 'DeviceCMYK' })).toBe('skip')
    expect(classifyImage({ ...JPEG, colorSpace: 'ICCBased', iccChannels: 4 })).toBe('skip')
    expect(classifyImage({ ...JPEG, hasMask: true })).toBe('skip')
    expect(classifyImage({ ...JPEG, hasDecode: true })).toBe('skip')
    expect(classifyImage({ ...JPEG, bytes: 5_000 })).toBe('skip')
    expect(classifyImage({ ...JPEG, filters: ['FlateDecode', 'DCTDecode'] })).toBe('skip')
  })

  it('reports Flate images separately', () => {
    expect(classifyImage({ ...JPEG, filters: ['FlateDecode'] })).toBe('flate')
  })
})

describe('scaledSize', () => {
  it('shrinks the long side only when it is over the limit', () => {
    expect(scaledSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(scaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('formatBytes / sizeChange', () => {
  it('formats sizes the Vietnamese way', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(20_480)).toBe('20 KB')
    expect(formatBytes(1_572_864)).toBe('1,5 MB')
  })

  it('describes the change in size', () => {
    expect(sizeChange(1000, 580)).toBe('nhỏ hơn 42%')
    expect(sizeChange(1000, 1080)).toBe('lớn hơn 8%')
    expect(sizeChange(1000, 998)).toBe('')
  })
})

describe('compressionSummary', () => {
  it('compares against the same file without compression', () => {
    const stats = addStats({ recompressed: 2, flate: 0, savedBytes: 600_000 }, { recompressed: 1, flate: 1, savedBytes: 400_000 })
    expect(compressionSummary(stats, 1_000_000)).toEqual({
      tone: 'success',
      text: 'Đã nén 3 ảnh: 1,9 MB → 977 KB (nhỏ hơn 50%). Giữ nguyên 1 ảnh PNG / trắng đen để chữ không bị nhoè.',
    })
  })

  it('says so when nothing could be recompressed', () => {
    expect(compressionSummary({ recompressed: 0, flate: 0, savedBytes: 0 }, 1000).tone).toBe('info')
  })
})
