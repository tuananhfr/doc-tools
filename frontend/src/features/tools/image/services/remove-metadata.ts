import { MAX_IMAGE_BYTES, maxImagePixels } from '@/features/tools/hub'
import { detectImageFormat, IMAGE_HEADER_BYTES, readImageSize } from '@/features/tools/shared'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from './image-codec'

export async function removeImageMetadata(file: File): Promise<{ blob: Blob; extension: string; width: number; height: number }> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Ảnh vượt giới hạn dung lượng.')
  const head = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
  const format = detectImageFormat(head)
  if (!format) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG và WebP.')
  const declared = readImageSize(head, format)
  if (declared && declared.width * declared.height > maxImagePixels()) throw new Error('Ảnh vượt giới hạn điểm ảnh.')
  const bitmap = await decodeImage(file)
  try {
    if (bitmap.width * bitmap.height > maxImagePixels()) throw new Error('Ảnh vượt giới hạn điểm ảnh.')
    const { canvas, context } = createCanvas(bitmap)
    try {
      if (format === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.drawImage(bitmap, 0, 0)
      const outputFormat = format === 'webp' ? 'png' : format
      const blob = await encodeCanvas(canvas, outputFormat)
      return { blob, extension: outputFormat === 'jpeg' ? 'jpg' : outputFormat, width: bitmap.width, height: bitmap.height }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}
