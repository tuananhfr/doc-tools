import { QR_BACKGROUND } from '../config/qr-colors'
import type { QrMatrix } from '../types/qr.types'
import { matrixPath, matrixSpan, QUIET_ZONE } from '../utils/qr-matrix'

/** Cạnh tối thiểu của ảnh PNG — đủ in rõ ở khổ ~8 cm (300 dpi). */
const PNG_MIN_SIZE = 1024

/** Tệp SVG: phóng to bao nhiêu cũng nét, dùng cho in ấn. */
export function qrSvgBlob(matrix: QrMatrix, color: string): Blob {
  const span = matrixSpan(matrix)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" width="${PNG_MIN_SIZE}" height="${PNG_MIN_SIZE}" shape-rendering="crispEdges">` +
    `<rect width="${span}" height="${span}" fill="${QR_BACKGROUND}"/>` +
    `<path d="${matrixPath(matrix)}" fill="${color}"/>` +
    '</svg>'
  return new Blob([svg], { type: 'image/svg+xml' })
}

/**
 * Ảnh PNG. Mỗi ô là một số NGUYÊN điểm ảnh: ô lẻ điểm ảnh bị làm mịn thành viền
 * xám, mã nhỏ in ra là máy quét đọc trượt.
 */
export function qrPngBlob(matrix: QrMatrix, color: string): Promise<Blob> {
  const span = matrixSpan(matrix)
  const cell = Math.ceil(PNG_MIN_SIZE / span)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = span * cell
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('trình duyệt không dựng được ảnh.'))

  context.fillStyle = QR_BACKGROUND
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = color
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (matrix.dark(column, row)) context.fillRect((column + QUIET_ZONE) * cell, (row + QUIET_ZONE) * cell, cell, cell)
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('trình duyệt không dựng được ảnh.'))), 'image/png')
  })
}
