import { MAX_IMAGE_BYTES, maxImagePixels, megabytes, TOOL_ERROR, type ToolErrorCode } from '@/features/tools/hub'
import { detectImageFormat, IMAGE_HEADER_BYTES, isHeic, readImageSize } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { newId } from '@/utils/id'
import type { ImageItem } from '../types/image.types'
import { fitWithin } from '../utils/image-format'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'

/** Cạnh dài ảnh thu nhỏ trong danh sách (ô 48px, màn hình mật độ 2). */
const THUMBNAIL_EDGE = 144

export type IntakeResult = { ok: true; item: ImageItem } | { ok: false; code: ToolErrorCode; reason: string }

/**
 * Nhận một ảnh: kiểm chữ ký byte + kích thước TRƯỚC khi giải mã, rồi giải mã
 * một lần để lấy kích thước thật (đã xoay theo EXIF) và vẽ ảnh thu nhỏ. Tệp
 * giải mã không nổi bị từ chối ngay ở đây, không để tới lúc chạy mới báo.
 */
export async function intakeImage(file: File): Promise<IntakeResult> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, code: TOOL_ERROR.fileTooLarge, reason: translate('image:intake.tooLarge', { size: megabytes(MAX_IMAGE_BYTES) }) }

  const head = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
  const format = detectImageFormat(head)
  if (!format) {
    return {
      ok: false,
      code: TOOL_ERROR.unsupportedFormat,
      reason: isHeic(head) ? translate('image:intake.heic') : translate('image:intake.unsupported'),
    }
  }

  const declared = readImageSize(head, format)
  if (declared && declared.width * declared.height > maxImagePixels()) {
    const millions = Math.round((declared.width * declared.height) / 1_000_000)
    return { ok: false, code: TOOL_ERROR.pixelLimit, reason: translate('image:intake.pixelLimit', { width: declared.width, height: declared.height, millions, limit: maxImagePixels() / 1_000_000 }) }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await decodeImage(file)
  } catch {
    return { ok: false, code: TOOL_ERROR.corruptFile, reason: translate('image:intake.corrupt') }
  }

  try {
    const { width, height } = bitmap
    const thumbnail = await thumbnailOf(bitmap)
    return { ok: true, item: { id: newId(), file, name: file.name, size: file.size, format, width, height, url: URL.createObjectURL(file), thumbnail } }
  } finally {
    bitmap.close()
  }
}

async function thumbnailOf(bitmap: ImageBitmap): Promise<string | null> {
  const { canvas, context } = createCanvas(fitWithin(bitmap, THUMBNAIL_EDGE))
  try {
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    // PNG để ảnh nền trong suốt không thành ô đen trong danh sách.
    return URL.createObjectURL(await encodeCanvas(canvas, 'png'))
  } catch {
    // Không vẽ được ảnh thu nhỏ thì danh sách hiện icon — không phải lỗi của tệp.
    return null
  } finally {
    releaseCanvas(canvas)
  }
}
