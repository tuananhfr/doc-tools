import { PDF_PHOTO_DPI, PRINT_DPI } from '../config/photo-presets'
import type { Rect, Size } from '../types/image.types'
import { snapRect } from '../utils/crop-rect'
import { setJpegDensity } from '../utils/jpeg-density'
import { mmToPt, mmToPx, type SheetLayout } from '../utils/photo-layout'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'

/** Chất lượng JPG của ảnh in: gần như không mất, vì máy in phóng mọi vết nén lên giấy. */
const PRINT_QUALITY = 0.95

/** Viền cắt: xám nhạt, đủ thấy để cắt mà không thành khung đen quanh ảnh. Màu trên GIẤY, không theo theme. */
const GUIDE_GRAY = 0.6

async function withDensity(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return setJpegDensity(bytes, dpi) ? new Blob([bytes], { type: 'image/jpeg' }) : blob
}

/** Một ảnh thẻ: vùng `rect` của ảnh gốc, thu về đúng cỡ in ở `dpi` (không phóng to quá điểm ảnh gốc). */
async function cropPhoto(source: Blob, rect: Rect, photo: Size, dpi: number): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(source)
  try {
    const area = snapRect(rect, bitmap)
    const width = Math.min(mmToPx(photo.width, dpi), area.width)
    const size = { width, height: Math.max(1, Math.round((width * photo.height) / photo.width)) }
    const { canvas, context } = createCanvas(size)
    try {
      context.fillStyle = 'white'
      context.fillRect(0, 0, size.width, size.height)
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, size.width, size.height)
      return { blob: await encodeCanvas(canvas, 'jpeg', PRINT_QUALITY), size }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}

/** Ảnh thẻ đơn, JPG mang mật độ 300 DPI — để nộp trực tuyến hoặc đem ra tiệm in. */
export async function renderSinglePhoto(source: Blob, rect: Rect, photo: Size): Promise<{ blob: Blob; size: Size }> {
  const { blob, size } = await cropPhoto(source, rect, photo, PRINT_DPI)
  return { blob: await withDensity(blob, PRINT_DPI), size }
}

/** Tờ in dạng ẢNH (JPG 300 DPI): cho máy in ảnh / tiệm in chỉ nhận tệp ảnh. */
export async function renderSheetImage(source: Blob, rect: Rect, layout: SheetLayout, guides: boolean): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(source)
  try {
    const area = snapRect(rect, bitmap)
    const size = { width: mmToPx(layout.paper.width, PRINT_DPI), height: mmToPx(layout.paper.height, PRINT_DPI) }
    const { canvas, context } = createCanvas(size)
    try {
      context.fillStyle = 'white'
      context.fillRect(0, 0, size.width, size.height)
      context.imageSmoothingQuality = 'high'
      const width = mmToPx(layout.photo.width, PRINT_DPI)
      const height = mmToPx(layout.photo.height, PRINT_DPI)
      const gray = Math.round(GUIDE_GRAY * 255)
      context.strokeStyle = `rgb(${gray} ${gray} ${gray})`
      context.lineWidth = 1
      for (const cell of layout.cells) {
        const x = mmToPx(cell.x, PRINT_DPI)
        const y = mmToPx(cell.y, PRINT_DPI)
        context.drawImage(bitmap, area.x, area.y, area.width, area.height, x, y, width, height)
        if (guides) context.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1)
      }
      return { blob: await withDensity(await encodeCanvas(canvas, 'jpeg', PRINT_QUALITY), PRINT_DPI), size }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}

/**
 * Tờ in dạng PDF: khổ giấy và từng ảnh đặt bằng số đo THẬT (pt), nên in "Actual
 * size / 100%" là ra đúng milimét. Ảnh nhúng MỘT lần, vẽ lại ở mọi ô.
 */
export async function renderSheetPdf(source: Blob, rect: Rect, layout: SheetLayout, guides: boolean, title: string): Promise<Blob> {
  const photo = await cropPhoto(source, rect, layout.photo, PDF_PHOTO_DPI)
  // pdf-lib nặng và chỉ cần ở bước xuất — nạp lúc dùng để màn mở ra không phải chờ nó.
  const { PDFDocument, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  const pageHeight = mmToPt(layout.paper.height)
  const page = pdf.addPage([mmToPt(layout.paper.width), pageHeight])
  const image = await pdf.embedJpg(await photo.blob.arrayBuffer())
  const width = mmToPt(layout.photo.width)
  const height = mmToPt(layout.photo.height)
  for (const cell of layout.cells) {
    // PDF đo từ góc DƯỚI-trái.
    const x = mmToPt(cell.x)
    const y = pageHeight - mmToPt(cell.y) - height
    page.drawImage(image, { x, y, width, height })
    if (guides) page.drawRectangle({ x, y, width, height, borderWidth: 0.25, borderColor: rgb(GUIDE_GRAY, GUIDE_GRAY, GUIDE_GRAY) })
  }
  const bytes = await pdf.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}
