import type { ImageFormat, Rect, Rotation, Size } from '../types/image.types'
import { adjustLut, applyLut, isNeutral, type Adjust } from '../utils/adjust'
import { rotatedSize, snapRect } from '../utils/crop-rect'
import { fitWithin } from '../utils/image-format'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas, rotateContext } from './image-codec'

export interface CropEdit extends Adjust {
  rotation: Rotation
  flipX?: boolean
  flipY?: boolean
  /** Khung cắt theo điểm ảnh của ảnh ĐÃ xoay. */
  rect: Rect
}

/**
 * Dựng ảnh kết quả từ ảnh gốc ở ĐỘ PHÂN GIẢI GỐC (bản xem trước chỉ là ảnh thu
 * nhỏ): xoay, cắt, rồi chỉnh sáng / tương phản từng điểm ảnh.
 */
export async function renderCrop(source: Blob, edit: CropEdit, format: ImageFormat, previewEdge?: number): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(source)
  try {
    const bounds = rotatedSize(bitmap, edit.rotation)
    const rect = snapRect(edit.rect, bounds)
    const output = fitWithin(rect, previewEdge ?? null)
    const { canvas, context } = createCanvas(output)
    try {
      if (format === 'jpeg') {
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.scale(output.width / rect.width, output.height / rect.height)
      context.translate(-rect.x, -rect.y)
      context.translate(edit.flipX ? bounds.width : 0, edit.flipY ? bounds.height : 0)
      context.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1)
      rotateContext(context, bitmap, edit.rotation)
      context.drawImage(bitmap, 0, 0)

      if (!isNeutral(edit)) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
        applyLut(pixels.data, adjustLut(edit))
        context.putImageData(pixels, 0, 0)
      }
      return { blob: await encodeCanvas(canvas, format), size: output }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}
