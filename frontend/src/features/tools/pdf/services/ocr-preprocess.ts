import type { OcrMatrix, OcrPass, OcrPipelineOptions } from '../types/ocr-profile.types'
import { IDENTITY, expandedRotation, invertMatrix, transformPoint } from '../utils/ocr-transform'
import { enhancePixels, suppressRulingPixels } from '../utils/ocr-image-variants'
import { estimateSkew, toGray } from '../utils/scan-analysis'
import { perspectiveMatrix, validPaperCorners } from '../utils/ocr-perspective'
import { CANVAS_CAP } from '../utils/canvas-cap'
import { detectPaperCorners } from '../utils/ocr-paper'

export interface OcrImageVariant { id: OcrPass; canvas: HTMLCanvasElement; toOriginal: OcrMatrix; operations?: OcrPass[]; layoutSample?: import('../utils/scan-analysis').GrayImage }

export function sampledGray(canvas: HTMLCanvasElement) {
  const sample = document.createElement('canvas'), scale = Math.min(1, 768 / Math.max(canvas.width, canvas.height))
  sample.width = Math.max(1, Math.round(canvas.width * scale)); sample.height = Math.max(1, Math.round(canvas.height * scale))
  const context = sample.getContext('2d', { willReadFrequently: true })!
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  return toGray(context.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height)
}

export function preprocessOcr(canvas: HTMLCanvasElement, options: OcrPipelineOptions): OcrImageVariant[] {
  const variants: OcrImageVariant[] = [{ id: 'original', canvas, toOriginal: IDENTITY }]
  if (options.maxPasses === 1) return variants
  const paper = options.perspective ?? detectPaperCorners(sampledGray(canvas))
  if (paper) {
    const corners = paper.map(point => ({ x: point.x * canvas.width, y: point.y * canvas.height })) as typeof paper
    if (!validPaperCorners(corners, canvas.width, canvas.height)) throw new Error('OCR_INVALID_CORNERS')
    const fromOriginal = perspectiveMatrix(corners, [{ x: 0, y: 0 }, { x: canvas.width, y: 0 }, { x: canvas.width, y: canvas.height }, { x: 0, y: canvas.height }])
    const toOriginal = invertMatrix(fromOriginal), variant = document.createElement('canvas')
    variant.width = canvas.width; variant.height = canvas.height
    const context = variant.getContext('2d')!, input = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height), output = context.createImageData(canvas.width, canvas.height)
    for (let y = 0; y < variant.height; y++) for (let x = 0; x < variant.width; x++) {
      const source = transformPoint(toOriginal, { x, y }), target = (y * variant.width + x) * 4
      const sx = Math.round(source.x), sy = Math.round(source.y)
      for (let channel = 0; channel < 3; channel++) output.data[target + channel] = sx >= 0 && sy >= 0 && sx < canvas.width && sy < canvas.height ? input.data[(sy * canvas.width + sx) * 4 + channel] : 255
      output.data[target + 3] = 255
    }
    context.putImageData(output, 0, 0); variants.push({ id: 'perspective', canvas: variant, toOriginal })
  } else {
    const skew = estimateSkew(sampledGray(canvas))
    if (skew !== null) {
      const rotation = expandedRotation(canvas.width, canvas.height, -skew), variant = document.createElement('canvas')
      const scale = Math.min(1, CANVAS_CAP.maxSide / Math.max(rotation.width, rotation.height), Math.sqrt(CANVAS_CAP.maxArea / (rotation.width * rotation.height)))
      variant.width = Math.max(1, Math.floor(rotation.width * scale)); variant.height = Math.max(1, Math.floor(rotation.height * scale))
      const sx = variant.width / rotation.width, sy = variant.height / rotation.height, raw = rotation.fromOriginal
      const matrix: OcrMatrix = [raw[0] * sx, raw[1] * sx, raw[2] * sx, raw[3] * sy, raw[4] * sy, raw[5] * sy, 0, 0, 1]
      const context = variant.getContext('2d')!
      context.fillStyle = 'white'; context.fillRect(0, 0, variant.width, variant.height)
      context.setTransform(matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5]); context.drawImage(canvas, 0, 0)
      variants.push({ id: 'deskew', canvas: variant, toOriginal: invertMatrix(matrix) })
    }
  }
  if (options.profile === 'table' && variants.length > 1) {
    const geometry = variants[1]
    geometry.layoutSample = sampledGray(geometry.canvas)
    const context = geometry.canvas.getContext('2d')!, pixels = context.getImageData(0, 0, geometry.canvas.width, geometry.canvas.height)
    pixels.data.set(enhancePixels(suppressRulingPixels(pixels.data, geometry.canvas.width, geometry.canvas.height), 'contrast'))
    context.putImageData(pixels, 0, 0); geometry.operations = [geometry.id, 'grid', 'contrast']
  }
  while (variants.length < options.maxPasses) {
    const variant = document.createElement('canvas'); variant.width = canvas.width; variant.height = canvas.height
    const mode = options.profile === 'mixed' || options.profile === 'handwriting' ? variants.some(item => item.id === 'blue-ink') ? 'red-ink' : 'blue-ink' : options.profile === 'numeric' || variants.some(item => item.id === 'contrast') ? 'threshold' : 'contrast'
    const context = variant.getContext('2d')!, pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    const grid = options.profile === 'table' && !variants.some(item => item.id === 'grid' || item.operations?.includes('grid'))
    pixels.data.set(grid ? enhancePixels(suppressRulingPixels(pixels.data, canvas.width, canvas.height), 'contrast') : enhancePixels(pixels.data, mode)); context.putImageData(pixels, 0, 0)
    variants.push({ id: grid ? 'grid' : mode, canvas: variant, toOriginal: IDENTITY, operations: grid ? ['grid', 'contrast'] : [mode] })
  }
  return variants.slice(0, options.maxPasses)
}
