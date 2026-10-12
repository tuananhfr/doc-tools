import { detectImageFormat, IMAGE_HEADER_BYTES, readImageSize } from '@/features/tools/shared'
import { MAX_IMAGE_BYTES, maxImagePixels } from '@/features/tools/hub/config/limits'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas } from '@/features/tools/image/services/image-codec'
import type { GraphicJob } from '../types/graphic.types'
import { graphicDimensions } from '../utils/graphic-layout'

async function checkedImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('IMAGE_FILE_LIMIT: ' + file.name)
  const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer()), format = detectImageFormat(header)
  if (!format) throw new Error('INVALID_IMAGE: ' + file.name)
  const size = readImageSize(header, format)
  if (size && size.width * size.height > maxImagePixels()) throw new Error('IMAGE_PIXEL_LIMIT: ' + file.name)
  const image = await decodeImage(file)
  if (image.width * image.height > maxImagePixels()) { image.close(); throw new Error('IMAGE_PIXEL_LIMIT: ' + file.name) }
  return image
}

function textBlock(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, color: string, maxLines: number, centered = false) {
  context.fillStyle = color; context.font = `600 ${size}px "Be Vietnam Pro", sans-serif`
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const character of Array.from(paragraph)) {
      if (line && context.measureText(line + character).width > width) { lines.push(line); line = '' }
      line += character
    }
    lines.push(line)
  }
  if (lines.length > maxLines) throw new Error('TEXT_DOES_NOT_FIT')
  lines.forEach((line, index) => context.fillText(line, centered ? x + (width - context.measureText(line).width) / 2 : x, y + index * size * 1.3))
  return lines.length * size * 1.3
}

export async function renderGraphicSheet(job: GraphicJob, files: File[], dpi = 300, type: 'png' | 'jpeg' = 'png', signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted(); await document.fonts.load('600 36px "Be Vietnam Pro"'); await document.fonts.ready
  const size = graphicDimensions(job.template, dpi), frame = createCanvas(size), context = frame.context, scale = dpi / 300
  const margin = job.template.marginMm / 25.4 * dpi, kind = job.template.kind, usable = size.width - margin * 2
  if (usable <= 0 || size.height <= margin * 2) throw new Error('PRINT_AREA_TOO_SMALL')
  try {
    if (job.brand.background !== 'transparent') { context.fillStyle = job.brand.background; context.fillRect(0, 0, size.width, size.height) }
    else if (type === 'jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, size.width, size.height) }
    const centered = ['logo', 'cup', 'box', 'bag', 'label'].includes(kind), watermark = kind === 'watermark', voucher = kind === 'voucher'
    const font = (voucher ? 82 : kind === 'logo' ? 96 : kind === 'label' ? 50 : 60) * scale
    const textWidth = usable - (!centered && job.logo ? 140 * scale : 0)
    let top = margin
    if (!watermark && !voucher && files.length) {
      if (job.brand.title) top += textBlock(context, job.brand.title, margin, top + font, textWidth, font, job.brand.accent, 2, centered)
      if (job.brand.subtitle) top += textBlock(context, job.brand.subtitle, margin, top + 36 * scale, usable, 36 * scale, '#334155', 3, centered)
      top += job.brand.title || job.brand.subtitle ? 30 * scale : 0
    }
    const rows = Math.ceil(job.template.slots / job.template.columns), gap = 18 * scale
    const imageLeft = margin, imageWidth = voucher ? usable * .38 : usable
    const cellWidth = (imageWidth - gap * (job.template.columns - 1)) / job.template.columns, cellHeight = (size.height - top - margin - gap * (rows - 1)) / rows
    if (cellWidth <= 0 || cellHeight <= 0) throw new Error('PRINT_AREA_TOO_SMALL')
    for (const [index, file] of files.entries()) {
      signal?.throwIfAborted(); const image = await checkedImage(file)
      try {
        const x = imageLeft + index % job.template.columns * (cellWidth + gap), y = top + Math.floor(index / job.template.columns) * (cellHeight + gap)
        const fit = job.brand.fit === 'cover' ? Math.max(cellWidth / image.width, cellHeight / image.height) : Math.min(cellWidth / image.width, cellHeight / image.height)
        context.save(); context.beginPath(); context.rect(x, y, cellWidth, cellHeight); context.clip()
        context.drawImage(image, x + (cellWidth - image.width * fit) / 2, y + (cellHeight - image.height * fit) / 2, image.width * fit, image.height * fit); context.restore()
      } finally { image.close() }
    }
    if (!watermark && (voucher || !files.length)) {
      const x = voucher && files.length ? margin + usable * .45 : margin, width = size.width - margin - x
      let y = size.height * (job.logo && centered ? .68 : .40)
      if (job.brand.title) y += textBlock(context, job.brand.title, x, y, width, font, job.brand.accent, 2, centered)
      if (job.brand.subtitle) y += textBlock(context, job.brand.subtitle, x, y + 15 * scale, width, 38 * scale, '#334155', 4, centered)
      if (y > size.height - margin) throw new Error('TEXT_DOES_NOT_FIT')
      if (voucher) { context.fillStyle = job.brand.accent; context.fillRect(margin, size.height - margin - 10 * scale, usable, 10 * scale) }
    }
    if (job.logo) {
      signal?.throwIfAborted(); const logo = await checkedImage(job.logo)
      try {
        const large = centered && !files.length, edge = large ? Math.min(usable * .6, size.height * .42) : 120 * scale
        const fit = Math.min(edge / logo.width, edge / logo.height), width = logo.width * fit, height = logo.height * fit
        context.drawImage(logo, large ? (size.width - width) / 2 : size.width - margin - width, large ? margin : margin, width, height)
      } finally { logo.close() }
    }
    if (watermark && (job.brand.title || job.brand.subtitle)) {
      context.save(); context.globalAlpha = .35; context.translate(size.width / 2, size.height / 2); context.rotate(-Math.PI / 6)
      const titleHeight=job.brand.title?textBlock(context, job.brand.title, -usable / 2, 0, usable, 100 * scale, job.brand.accent, 2, true):0
      if(job.brand.subtitle)textBlock(context,job.brand.subtitle,-usable/2,titleHeight+45*scale,usable,40*scale,job.brand.accent,3,true)
      context.restore()
    }
    signal?.throwIfAborted(); return await encodeCanvas(frame.canvas, type, .95)
  } finally { releaseCanvas(frame.canvas) }
}
