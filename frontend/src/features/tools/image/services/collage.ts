import { MAX_IMAGE_BYTES, maxImagePixels } from '@/features/tools/hub'
import { detectImageFormat, IMAGE_HEADER_BYTES, readImageSize } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { createCanvas, decodeImage, releaseCanvas } from './image-codec'

export async function makeImageCollage(files: File[], columns: number, gap: number): Promise<Blob> {
  if (files.length < 2 || files.length > 9 || !Number.isInteger(columns) || columns < 1 || columns > 3 || !Number.isInteger(gap) || gap < 0 || gap > 100) throw new Error(translate('image:collage.invalid'))
  const tile = 900
  const rows = Math.ceil(files.length / columns)
  const width = columns * tile + (columns + 1) * gap
  const height = rows * tile + (rows + 1) * gap
  const { canvas, context } = createCanvas({ width, height })
  try {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    for (const [index, file] of files.entries()) {
      if (file.size > MAX_IMAGE_BYTES) throw new Error(translate('image:collage.tooLarge', { name: file.name }))
      const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
      const format = detectImageFormat(header)
      if (!format) throw new Error(translate('image:collage.unsupported', { name: file.name }))
      const size = readImageSize(header, format)
      if (size && size.width * size.height > maxImagePixels()) throw new Error(translate('image:collage.pixelLimit', { name: file.name }))
      const bitmap = await decodeImage(file)
      try {
        if (bitmap.width * bitmap.height > maxImagePixels()) throw new Error(translate('image:collage.pixelLimit', { name: file.name }))
        const scale = Math.max(tile / bitmap.width, tile / bitmap.height)
        const drawWidth = bitmap.width * scale
        const drawHeight = bitmap.height * scale
        const x = gap + index % columns * (tile + gap)
        const y = gap + Math.floor(index / columns) * (tile + gap)
        context.save()
        context.beginPath()
        context.rect(x, y, tile, tile)
        context.clip()
        context.drawImage(bitmap, x + (tile - drawWidth) / 2, y + (tile - drawHeight) / 2, drawWidth, drawHeight)
        context.restore()
      } finally {
        bitmap.close()
      }
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(translate('image:collage.failed'))), 'image/png'))
  } finally {
    releaseCanvas(canvas)
  }
}
