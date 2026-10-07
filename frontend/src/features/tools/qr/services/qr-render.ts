import { translate } from '@/i18n/runtime'
import { QR_BACKGROUND } from '../config/qr-colors'
import type { QrMatrix } from '../types/qr.types'
import { matrixPath, matrixSpan, QUIET_ZONE } from '../utils/qr-matrix'

/** Cạnh tối thiểu của ảnh PNG — đủ in rõ ở khổ ~8 cm (300 dpi). */
const PNG_MIN_SIZE = 1024

/** Tệp SVG: phóng to bao nhiêu cũng nét, dùng cho in ấn. */
export function qrSvgBlob(matrix: QrMatrix, color: string, background: string | null = QR_BACKGROUND): Blob {
  const span = matrixSpan(matrix)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" width="${PNG_MIN_SIZE}" height="${PNG_MIN_SIZE}" shape-rendering="crispEdges">` +
    (background === null ? '' : `<rect width="${span}" height="${span}" fill="${background}"/>`) +
    `<path d="${matrixPath(matrix)}" fill="${color}"/>` +
    '</svg>'
  return new Blob([svg], { type: 'image/svg+xml' })
}

/**
 * Ảnh PNG. Mỗi ô là một số NGUYÊN điểm ảnh: ô lẻ điểm ảnh bị làm mịn thành viền
 * xám, mã nhỏ in ra là máy quét đọc trượt.
 */
export function qrPngBlob(matrix: QrMatrix, color: string, background: string | null = QR_BACKGROUND): Promise<Blob> {
  const span = matrixSpan(matrix)
  const cell = Math.ceil(PNG_MIN_SIZE / span)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = span * cell
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error(translate('qr:render.imageFailed')))

  if (background !== null) {
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.fillStyle = color
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (matrix.dark(column, row)) context.fillRect((column + QUIET_ZONE) * cell, (row + QUIET_ZONE) * cell, cell, cell)
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(translate('qr:render.imageFailed')))), 'image/png')
  })
}

/** The transparent option omits the page background fill. */
export async function qrPdfBlob(matrix: QrMatrix, color: string, background: string | null = QR_BACKGROUND): Promise<Blob> {
  const { PDFDocument, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const span = matrixSpan(matrix)
  const pageSize = 288
  const cell = pageSize / span
  const page = doc.addPage([pageSize, pageSize])
  const pdfColor = (hex: string) => rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  )
  if (background !== null) page.drawRectangle({ x: 0, y: 0, width: pageSize, height: pageSize, color: pdfColor(background) })
  const ink = pdfColor(color)
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (matrix.dark(column, row)) page.drawRectangle({
        x: (column + QUIET_ZONE) * cell,
        y: pageSize - (row + QUIET_ZONE + 1) * cell,
        width: cell,
        height: cell,
        color: ink,
      })
    }
  }
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' })
}
