import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createZipWriter, zipFiles } from './zip'

const text = (value: string) => new TextEncoder().encode(value)

describe('zip ghi dần', () => {
  it('giữ nguyên nội dung và tên tiếng Việt', async () => {
    const writer = createZipWriter()
    writer.add('Biên bản - 001.jpg', text('một'))
    writer.add('Biên bản - 002.jpg', text('hai'))
    const files = unzipSync(new Uint8Array(await writer.finish().arrayBuffer()))
    expect(Object.keys(files)).toEqual(['Biên bản - 001.jpg', 'Biên bản - 002.jpg'])
    expect(new TextDecoder().decode(files['Biên bản - 002.jpg'])).toBe('hai')
  })

  it('đánh số tên trùng thay vì ghi đè', async () => {
    const blob = zipFiles([
      { name: 'a.pdf', data: text('1') },
      { name: 'a.pdf', data: text('2') },
      { name: 'README', data: text('3') },
      { name: 'README', data: text('4') },
    ])
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    expect(Object.keys(files)).toEqual(['a.pdf', 'a (2).pdf', 'README', 'README (2)'])
  })

  it('coi tên chỉ khác hoa thường là trùng — Windows / macOS giải nén ra sẽ đè nhau', async () => {
    const blob = zipFiles([
      { name: 'Trang.jpg', data: text('1') },
      { name: 'trang.JPG', data: text('2') },
    ])
    expect(Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))).toEqual(['Trang.jpg', 'trang (2).JPG'])
  })
})
