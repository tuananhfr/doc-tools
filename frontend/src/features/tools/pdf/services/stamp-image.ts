import { MAX_IMAGE_BYTES, maxImagePixels, megabytes, TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob, detectImageFormat, readImageSize } from '@/features/tools/shared'

/** Ảnh dấu đã chuẩn hoá, sẵn để nhúng vào PDF. */
export interface StampImage {
  name: string
  bytes: Uint8Array<ArrayBuffer>
  mime: 'image/png' | 'image/jpeg'
  /** Cao / rộng. */
  aspect: number
}

/** Dấu chiếm nhiều nhất cả bề rộng trang A3 ở ~170 DPI — lớn hơn chỉ làm tệp ra nặng thêm. */
const MAX_EDGE = 2000

/**
 * Vẽ lại ảnh dấu qua canvas trước khi nhúng: pdf-lib bỏ qua hướng EXIF (ảnh chụp
 * con dấu bằng điện thoại sẽ nằm ngang trong PDF dù bản xem trước đứng thẳng),
 * không đọc được JPEG CMYK / progressive lạ, và logo 20 MP nhúng nguyên là mỗi
 * tệp ra nặng thêm chừng đó. PNG giữ PNG để còn nền trong suốt.
 */
export async function prepareStampImage(file: File): Promise<StampImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new ToolError(TOOL_ERROR.fileTooLarge, `Ảnh dấu vượt ${megabytes(MAX_IMAGE_BYTES)}.`)
  const original = new Uint8Array(await file.arrayBuffer())
  const format = detectImageFormat(original)
  if (format !== 'png' && format !== 'jpeg') throw new ToolError(TOOL_ERROR.unsupportedFormat, 'Ảnh dấu phải là PNG hoặc JPG.')
  const declared = readImageSize(original, format)
  if (declared && declared.width * declared.height > maxImagePixels()) throw new ToolError(TOOL_ERROR.pixelLimit, 'Ảnh dấu quá lớn — thu nhỏ ảnh rồi chọn lại.')

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([original], { type: mime }), { imageOrientation: 'from-image' })
  } catch (cause) {
    throw new ToolError(TOOL_ERROR.corruptFile, 'Không mở được ảnh dấu — tệp có thể đã hỏng.', { cause })
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new ToolError(TOOL_ERROR.memory, 'Trình duyệt không cấp được vùng vẽ cho ảnh dấu.')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await canvasToBlob(canvas, mime)
    const aspect = canvas.height / canvas.width
    canvas.width = 0
    return { name: file.name, bytes: new Uint8Array(await blob.arrayBuffer()), mime, aspect }
  } finally {
    bitmap.close()
  }
}
