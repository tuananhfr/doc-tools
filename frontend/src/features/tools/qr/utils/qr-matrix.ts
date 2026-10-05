import { create } from 'qrcode'
import type { QrMatrix } from '../types/qr.types'

/** Vùng trắng bao quanh mã, tính bằng ô — chuẩn QR yêu cầu 4, hẹp hơn là máy quét cũ không bắt được. */
export const QUIET_ZONE = 4

/**
 * Lưới ô của mã QR cho một chuỗi. Thử mức sửa lỗi M trước (chịu được mã bị bẩn
 * / in mờ ~15%), chuỗi dài quá thì lùi về L. `null` = dài hơn sức chứa của một mã.
 */
export function createMatrix(text: string): QrMatrix | null {
  for (const errorCorrectionLevel of ['M', 'L'] as const) {
    try {
      const { modules } = create(text, { errorCorrectionLevel })
      return { size: modules.size, dark: (column, row) => modules.data[row * modules.size + column] === 1 }
    } catch {
      // Quá sức chứa ở mức này: thử mức thấp hơn.
    }
  }
  return null
}

/** Cạnh của mã kể cả vùng trắng, tính bằng ô. */
export function matrixSpan(matrix: QrMatrix): number {
  return matrix.size + QUIET_ZONE * 2
}

/**
 * Thuộc tính `d` của một `<path>` vẽ mọi ô tối, toạ độ tính bằng ô và đã cộng
 * vùng trắng. Gộp các ô liền nhau trên một hàng thành một hình chữ nhật: mã 57
 * ô có ~1.600 ô tối, vẽ từng ô là tệp SVG nặng gấp ba.
 */
export function matrixPath(matrix: QrMatrix): string {
  const parts: string[] = []
  for (let row = 0; row < matrix.size; row++) {
    let start = -1
    for (let column = 0; column <= matrix.size; column++) {
      const dark = column < matrix.size && matrix.dark(column, row)
      if (dark && start < 0) start = column
      if (!dark && start >= 0) {
        parts.push(`M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${column - start}v1h-${column - start}z`)
        start = -1
      }
    }
  }
  return parts.join('')
}
