import { MAX_IMAGE_BYTES, maxImagePixels } from '@/features/tools/hub'
import { detectImageFormat, IMAGE_HEADER_BYTES, readImageSize } from '@/features/tools/shared'
import { createCanvas, decodeImage, releaseCanvas } from './image-codec'

export async function makeImageCollage(files: File[], columns: number, gap: number): Promise<Blob> {
  if (files.length < 2 || files.length > 9 || !Number.isInteger(columns) || columns < 1 || columns > 3 || !Number.isInteger(gap) || gap < 0 || gap > 100) throw new Error('Chọn 2–9 ảnh, 1–3 cột và khoảng cách 0–100 px.')
  const tile = 900
  const rows = Math.ceil(files.length / columns)
  const width = columns * tile + (columns + 1) * gap
  const height = rows * tile + (rows + 1) * gap
  const { canvas, context } = createCanvas({ width, height })
  try {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    for (const [index, file] of files.entries()) {
      if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: ảnh vượt giới hạn dung lượng.`)
      const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
      const format = detectImageFormat(header)
      if (!format) throw new Error(`${file.name}: chỉ hỗ trợ JPG, PNG và WebP.`)
      const size = readImageSize(header, format)
      if (size && size.width * size.height > maxImagePixels()) throw new Error(`${file.name}: ảnh vượt giới hạn điểm ảnh.`)
      const bitmap = await decodeImage(file)
      try {
        if (bitmap.width * bitmap.height > maxImagePixels()) throw new Error(`${file.name}: ảnh vượt giới hạn điểm ảnh.`)
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
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh ghép.')), 'image/png'))
  } finally {
    releaseCanvas(canvas)
  }
}
