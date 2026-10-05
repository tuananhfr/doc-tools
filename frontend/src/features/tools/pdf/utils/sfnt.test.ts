import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readSfnt } from './sfnt'

const bytes = (name: string) => {
  const file = readFileSync(`src/assets/fonts/${name}`)
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
}

/** Tệp phông tối thiểu: chỉ đủ `head`, `hhea`, `OS/2` với các ô cần đọc. */
function fakeFont({ fsType = 0, fsSelection = 0 }: { fsType?: number; fsSelection?: number }): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(12 + 3 * 16 + 54 + 36 + 96))
  view.setUint32(0, 0x00010000)
  view.setUint16(4, 3)
  const tables: [string, number, number][] = [
    ['head', 60, 54],
    ['hhea', 114, 36],
    ['OS/2', 150, 96],
  ]
  tables.forEach(([name, offset, length], index) => {
    const entry = 12 + index * 16
    for (let i = 0; i < 4; i++) view.setUint8(entry + i, name.charCodeAt(i))
    view.setUint32(entry + 8, offset)
    view.setUint32(entry + 12, length)
  })
  view.setUint16(60 + 18, 1000)
  view.setInt16(114 + 4, 900)
  view.setInt16(114 + 6, -200)
  view.setUint16(150 + 8, fsType)
  view.setUint16(150 + 62, fsSelection)
  view.setInt16(150 + 68, 750)
  view.setInt16(150 + 70, -250)
  return view.buffer
}

describe('readSfnt', () => {
  it('Arimo / Tinos giữ đầu-đuôi dòng của Arial / Times New Roman', () => {
    const arimo = readSfnt(bytes('Arimo-Regular.ttf'))
    const tinos = readSfnt(bytes('Tinos-Regular.ttf'))
    expect(arimo?.embeddable).toBe(true)
    expect(arimo?.ascent).toBeCloseTo(0.905, 3)
    expect(arimo?.descent).toBeCloseTo(0.212, 3)
    expect(tinos?.ascent).toBeCloseTo(0.891, 3)
    expect(tinos?.descent).toBeCloseTo(0.216, 3)
  })

  it('phông cấm nhúng thì không dùng; cho xem-in hoặc sửa thì dùng được', () => {
    expect(readSfnt(fakeFont({ fsType: 0x0002 }))?.embeddable).toBe(false)
    expect(readSfnt(fakeFont({ fsType: 0x0200 }))?.embeddable).toBe(false)
    expect(readSfnt(fakeFont({ fsType: 0x0008 }))?.embeddable).toBe(true)
    expect(readSfnt(fakeFont({ fsType: 0x0004 }))?.embeddable).toBe(true)
  })

  it('đầu-đuôi dòng lấy từ hhea, trừ khi phông bật USE_TYPO_METRICS', () => {
    expect(readSfnt(fakeFont({}))).toMatchObject({ ascent: 0.9, descent: 0.2 })
    expect(readSfnt(fakeFont({ fsSelection: 0x0080 }))).toMatchObject({ ascent: 0.75, descent: 0.25 })
  })

  it('tệp gộp nhiều phông hoặc tệp hỏng trả null', () => {
    const collection = new DataView(new ArrayBuffer(64))
    collection.setUint32(0, 0x74746366)
    expect(readSfnt(collection.buffer)).toBeNull()
    expect(readSfnt(new ArrayBuffer(4))).toBeNull()
  })
})
