import { describe, expect, it } from 'vitest'
import { attachPngExif, readPngExif, readWebpExif } from './png-webp-exif'

const EXIF_ID = [0x45, 0x78, 0x69, 0x66, 0, 0]
// TIFF tối thiểu: "II", 42, IFD0 ở offset 8, 0 entry, không có IFD kế.
const TIFF = [0x49, 0x49, 42, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const EXIF = new Uint8Array([...EXIF_ID, ...TIFF])

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))
const u32be = (value: number) => [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
const u32le = (value: number) => u32be(value).reverse()

const pngChunk = (name: string, data: number[]) => [...u32be(data.length), ...ascii(name), ...data, 0, 0, 0, 0]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const png = (...chunks: number[][]) => new Uint8Array([...PNG_SIGNATURE, ...chunks.flat()])
const IHDR = pngChunk('IHDR', new Array<number>(13).fill(0))
const IDAT = pngChunk('IDAT', [1, 2, 3])
// CRC của chunk IEND rỗng là hằng số của định dạng PNG.
const IEND = [...u32be(0), ...ascii('IEND'), 0xae, 0x42, 0x60, 0x82]

const webp = (...chunks: number[][]) => {
  const body = [...ascii('WEBP'), ...chunks.flat()]
  return new Uint8Array([...ascii('RIFF'), ...u32le(body.length), ...body])
}
const riffChunk = (name: string, data: number[]) => [...ascii(name), ...u32le(data.length), ...data, ...(data.length & 1 ? [0] : [])]

describe('readPngExif', () => {
  it('reads an eXIf chunk placed after the image data', () => {
    expect(readPngExif(png(IHDR, IDAT, pngChunk('eXIf', TIFF), IEND))).toEqual(EXIF)
  })

  it('returns null without the chunk, or for a non-PNG', () => {
    expect(readPngExif(png(IHDR, IDAT, IEND))).toBeNull()
    expect(readPngExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull()
  })

  it('returns null when the chunk runs past the end of the file', () => {
    expect(readPngExif(png(IHDR, [...u32be(500), ...ascii('eXIf'), 1, 2, 3]))).toBeNull()
  })
})

describe('readWebpExif', () => {
  it('reads the EXIF chunk past an odd-sized chunk', () => {
    expect(readWebpExif(webp(riffChunk('VP8 ', [1, 2, 3]), riffChunk('EXIF', TIFF)))).toEqual(EXIF)
  })

  it('does not double the JPEG prefix some writers leave in', () => {
    expect(readWebpExif(webp(riffChunk('EXIF', [...EXIF_ID, ...TIFF])))).toEqual(EXIF)
  })

  it('returns null without the chunk', () => {
    expect(readWebpExif(webp(riffChunk('VP8 ', [1, 2])))).toBeNull()
  })
})

describe('attachPngExif', () => {
  it('inserts a chunk right after IHDR that reads back unchanged', async () => {
    const source = png(IHDR, IDAT, IEND)
    const tagged = await attachPngExif(new Blob([source]), EXIF)
    const bytes = new Uint8Array(await tagged!.arrayBuffer())
    expect(bytes.length).toBe(source.length + 12 + TIFF.length)
    expect(String.fromCharCode(...bytes.subarray(37, 41))).toBe('eXIf')
    expect(readPngExif(bytes)).toEqual(EXIF)
    expect([...bytes.subarray(bytes.length - IEND.length)]).toEqual(IEND)
  })

  it('writes the CRC a PNG reader expects', async () => {
    // Chèn "khối EXIF" rỗng ruột → chunk eXIf dài 0, CRC chỉ phủ bốn chữ tên.
    const tagged = await attachPngExif(new Blob([png(IHDR, IEND)]), new Uint8Array(EXIF_ID))
    const bytes = new Uint8Array(await tagged!.arrayBuffer())
    expect([...bytes.subarray(41, 45)]).toEqual(u32be(0xca799704))
  })

  it('refuses a non-PNG and a block without the Exif prefix', async () => {
    expect(await attachPngExif(new Blob([new Uint8Array(64)]), EXIF)).toBeNull()
    expect(await attachPngExif(new Blob([png(IHDR, IEND)]), new Uint8Array(TIFF))).toBeNull()
  })
})
