import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { CanvasEncodeError, canvasToBlob, KEEP_QUALITY } from '@/features/tools/shared'
import type { ImageFormat, Rotation, Size } from '../types/image.types'
import { IMAGE_FORMAT, sizeLabel } from '../utils/image-format'

/**
 * Giải mã ảnh, ĐÃ xoay theo hướng EXIF (ảnh chụp điện thoại lưu điểm ảnh nằm
 * ngang kèm cờ xoay). Người gọi phải `close()` bitmap khi xong — mỗi ảnh 12 MP
 * giữ ~48 MB ngoài heap, quên đóng vài chục ảnh là tab bị giết.
 */
export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ToolError(TOOL_ERROR.corruptFile, 'không đọc được ảnh — tệp hỏng hoặc trình duyệt không mở được định dạng này.')
  }
}

export function createCanvas(size: Size): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new ToolError(TOOL_ERROR.memory, `ảnh ${sizeLabel(size)} quá lớn với trình duyệt này.`)
  return { canvas, context }
}

let webpEncoding: boolean | null = null

/** Safari không ghi được WebP: `toBlob('image/webp')` lặng lẽ trả về PNG. Hỏi trước để không mời thứ không làm được. */
export function canEncodeWebp(): boolean {
  if (webpEncoding === null) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpEncoding = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpEncoding
}

/** Định dạng thật sẽ ghi ra khi muốn giữ định dạng của ảnh gốc. */
export function writableFormat(format: ImageFormat): ImageFormat {
  return format === 'webp' && !canEncodeWebp() ? 'png' : format
}

/** `quality` chỉ có nghĩa với JPG và WebP; PNG luôn không mất dữ liệu. */
export async function encodeCanvas(canvas: HTMLCanvasElement, format: ImageFormat, quality = KEEP_QUALITY): Promise<Blob> {
  try {
    return await canvasToBlob(canvas, IMAGE_FORMAT[format].mime, quality)
  } catch (error) {
    if (error instanceof CanvasEncodeError && error.reason === 'unsupported') throw new ToolError(TOOL_ERROR.exportFailed, `trình duyệt này không xuất được ${IMAGE_FORMAT[format].label}.`, { cause: error })
    throw new ToolError(TOOL_ERROR.memory, `ảnh ${sizeLabel(canvas)} quá lớn với trình duyệt này — thu nhỏ cạnh dài rồi thử lại.`, { cause: error })
  }
}

/** Trả canvas về 0 × 0: Safari giữ bộ nhớ canvas tới khi dọn rác, vài ảnh lớn liên tiếp là hết trần. */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

/**
 * Đặt phép biến đổi để lệnh vẽ ảnh kế tiếp (ở gốc 0,0, kích thước `size`) ra
 * đúng ảnh đã xoay `rotation` độ theo chiều kim đồng hồ, góc trên-trái vẫn ở (0,0).
 */
export function rotateContext(context: CanvasRenderingContext2D, size: Size, rotation: Rotation): void {
  if (rotation === 90) context.translate(size.height, 0)
  else if (rotation === 180) context.translate(size.width, size.height)
  else if (rotation === 270) context.translate(0, size.width)
  context.rotate((rotation * Math.PI) / 180)
}
