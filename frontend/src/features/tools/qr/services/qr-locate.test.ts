import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library'
import { locateQr } from './qr-locate'

function fixture(corrupt = false, rotate = false, scale = 2, height = 240) {
  const matrix = QRCode.create('AUTO-ZOOM', { version: 2, errorCorrectionLevel: 'L' }).modules
  const width = 360
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      const finder = (row < 7 && (column < 7 || column >= matrix.size - 7)) || (column < 7 && row >= matrix.size - 7)
      if (!matrix.data[row * matrix.size + column] || (corrupt && !finder)) continue
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const x = 130 + (rotate ? matrix.size - 1 - row : column) * scale + dx
        const y = 80 + (rotate ? column : row) * scale + dy
        const offset = (y * width + x) * 4
        data[offset] = data[offset + 1] = data[offset + 2] = 0
      }
    }
  }
  return { data, width, height }
}

describe('QR location before decoding', () => {
  it('locates a small QR in the full camera frame', () => {
    const box = locateQr(fixture())!
    expect(box.x).toBeCloseTo(130 / 360)
    expect(box.y).toBeCloseTo(80 / 240)
    expect(box.width).toBeCloseTo(50 / 360)
    expect(box.height).toBeCloseTo(50 / 240)
  })

  it('locates finder patterns even when the payload cannot be read', () => {
    const image = fixture(true)
    const gray = new Uint8ClampedArray(image.width * image.height)
    for (let i = 0; i < gray.length; i++) gray[i] = image.data[i * 4]
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray, image.width, image.height)))
    expect(() => new QRCodeReader().decode(bitmap)).toThrow()
    expect(locateQr(image)).not.toBeNull()
  })

  it('finds a rotated QR without changing its normalized size', () => {
    expect(locateQr(fixture(false, true))).toEqual(locateQr(fixture()))
  })

  it('finds small finder patterns between default scan rows in a tall frame', () => {
    expect(locateQr(fixture(true, false, 1, 1080))).not.toBeNull()
  })

  it('ignores a blank frame and ordinary barcode-like stripes', () => {
    const image = fixture()
    image.data.fill(255)
    expect(locateQr(image)).toBeNull()
    for (let y = 80; y < 140; y++) for (let x = 100; x < 250; x++) {
      if (x % 4 < 2) {
        const offset = (y * image.width + x) * 4
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 0
      }
    }
    expect(locateQr(image)).toBeNull()
  })
})
