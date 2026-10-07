import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, type Result } from '@zxing/library'
import { MAX_IMAGE_BYTES, maxImagePixels, megabytes } from '@/features/tools/hub'
import { detectImageFormat, IMAGE_HEADER_BYTES, readImageSize } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { QR_BACKGROUND } from '../config/qr-colors'

export interface ScanRead {
  text: string
  format: string
}

/**
 * Cạnh dài lần lượt thử. Ảnh điện thoại 12 MP để nguyên cỡ thì quét chậm cả giây
 * mà còn dễ trượt (nhiễu hạt); thu nhỏ trước, không ra mới thử cỡ khác — mã
 * chiếm một góc nhỏ của ảnh chỉ đọc được ở cỡ lớn.
 */
const SCAN_SIZES = [1600, 800, 3000]

export function readOf(result: Result): ScanRead {
  return { text: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] ?? 'UNKNOWN' }
}

/** Bộ đọc cho ảnh tĩnh: `TRY_HARDER` chậm hơn nhưng bắt được mã nghiêng / mã vạch mờ. */
function stillReader(): BrowserMultiFormatReader {
  return new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER, true]]))
}

async function loadImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    // `from-image`: xoay theo EXIF — ảnh chụp dọc bằng điện thoại không bị nằm ngang.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Lý do KHÔNG quét một ảnh, xét trước khi giải mã; `null` = quét được. Cùng trần
 * với công cụ ảnh: ảnh vượt trần làm sập tab ngay ở `createImageBitmap`, chặn sau
 * đó là quá muộn. Định dạng không đọc được header thì chỉ xét dung lượng — bước
 * giải mã sẽ lên tiếng.
 */
export async function scanLimitReason(file: Blob): Promise<string | null> {
  if (file.size > MAX_IMAGE_BYTES) return translate('qr:read.tooLarge', { size: megabytes(MAX_IMAGE_BYTES) })
  const head = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
  const format = detectImageFormat(head)
  const size = format ? readImageSize(head, format) : null
  if (size && size.width * size.height > maxImagePixels()) {
    return translate('qr:read.tooManyPixels', { pixels: Math.round((size.width * size.height) / 1_000_000), limit: maxImagePixels() / 1_000_000 })
  }
  return null
}

/**
 * Tìm MỘT mã (QR hoặc mã vạch) trong ảnh. `null` = không thấy mã nào; ném lỗi =
 * tệp không phải ảnh trình duyệt mở được.
 */
export async function scanImage(file: Blob): Promise<ScanRead | null> {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error(translate('qr:render.imageFailed'))
    const longest = Math.max(image.width, image.height)
    const reader = stillReader()
    const tried = new Set<number>()

    for (const size of SCAN_SIZES) {
      const scale = Math.min(1, size / longest)
      const width = Math.max(1, Math.round(image.width * scale))
      // Ảnh nhỏ hơn mọi cỡ thử chỉ có một cỡ thật: không quét lại ba lần cùng một ảnh.
      if (tried.has(width)) continue
      tried.add(width)

      canvas.width = width
      canvas.height = Math.max(1, Math.round(image.height * scale))
      // Ảnh PNG nền trong suốt vẽ lên canvas trống thành nền ĐEN, mã đen trên đó là mất.
      context.fillStyle = QR_BACKGROUND
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image.source, 0, 0, canvas.width, canvas.height)
      try {
        return readOf(reader.decodeFromCanvas(canvas))
      } catch {
        // zxing ném NotFoundException khi không thấy mã: thử cỡ kế tiếp.
      }
    }
    return null
  } finally {
    image.close()
    // Safari giữ bộ nhớ canvas tới khi GC; thu về 0 để trả ngay.
    canvas.width = canvas.height = 0
  }
}
