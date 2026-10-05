/** Độ sáng / tương phản tính theo hệ số: 1 = giữ nguyên, 0.5–1.5 là khoảng thanh trượt cho chọn. */
export interface Adjust {
  brightness: number
  contrast: number
}

export const NEUTRAL_ADJUST: Adjust = { brightness: 1, contrast: 1 }

export function isNeutral(adjust: Adjust): boolean {
  return adjust.brightness === 1 && adjust.contrast === 1
}

/** Chuỗi `filter` của CSS cho bản xem trước — tệp xuất dùng `adjustLut` cho ra đúng kết quả đó. */
export function adjustFilter(adjust: Adjust): string {
  return isNeutral(adjust) ? 'none' : `brightness(${adjust.brightness}) contrast(${adjust.contrast})`
}

/**
 * Bảng tra 256 mức cho một kênh màu, khớp `filter: brightness() contrast()` của
 * CSS: sáng trước, tương phản sau, kẹp về [0, 1] sau MỖI bước. Tự tính thay vì
 * dùng `context.filter` vì Safari cũ không có thuộc tính đó — ảnh xuất ra sẽ
 * lặng lẽ khác bản xem trước.
 */
export function adjustLut(adjust: Adjust): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256)
  for (let level = 0; level < 256; level++) {
    const bright = Math.min(1, (level / 255) * adjust.brightness)
    const contrasted = (bright - 0.5) * adjust.contrast + 0.5
    lut[level] = Math.round(Math.min(1, Math.max(0, contrasted)) * 255)
  }
  return lut
}

/** Áp bảng tra lên ba kênh màu của dữ liệu RGBA; kênh alpha giữ nguyên. */
export function applyLut(data: Uint8ClampedArray, lut: Uint8ClampedArray): void {
  for (let index = 0; index < data.length; index += 4) {
    data[index] = lut[data[index]]
    data[index + 1] = lut[data[index + 1]]
    data[index + 2] = lut[data[index + 2]]
  }
}
