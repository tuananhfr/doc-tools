import { newId } from '@/utils/id'
import type { QuickItem } from '../hooks/useQuickSources'
import type { ImageSource } from '../types/doc-tools.types'
import { sampledGray } from './ocr-preprocess'
import { detectScanCorners } from '../utils/scan-paper'
import { ocrQuality } from '../utils/ocr-quality'
import type { OcrQualityFlag } from '../types/ocr-result.types'
import { estimateSkew } from '../utils/scan-analysis'
import { expandedRotation, transformPoint } from '../utils/ocr-transform'
import { scanColor, scanGeometry, SCAN_MAX_PIXELS, type ScanOptions } from '../utils/document-scan'

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0))
export async function loadScanCanvas(source: ImageSource) {
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  try {
    const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height), Math.sqrt(SCAN_MAX_PIXELS / (bitmap.width * bitmap.height)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(2, Math.round(bitmap.width * scale)); canvas.height = Math.max(2, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('SCAN_CANVAS')
    context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally { bitmap.close() }
}

export function findScanCorners(canvas: HTMLCanvasElement) { return detectScanCorners(sampledGray(canvas)) }

export async function autoScanDocument(item: QuickItem, signal: AbortSignal, onQuality?: (flags: OcrQualityFlag[]) => void) {
  signal.throwIfAborted()
  if (item.source.kind !== 'image') return null
  const canvas = await loadScanCanvas(item.source)
  let corners: ReturnType<typeof findScanCorners>
  try {
    signal.throwIfAborted()
    const sample = sampledGray(canvas)
    onQuality?.(ocrQuality(sample, { width: canvas.width, height: canvas.height }))
    corners = detectScanCorners(sample)
  }
  finally { canvas.width = canvas.height = 1 }
  if (!corners) return null
  const options: ScanOptions = { corners, preset: 'color', rotation: 0, deskew: true }
  return { item: await scanDocument(item, options, signal), options }
}

/** Derive a new image; originals are never overwritten. Preview and PDF use this same derivative. */
export async function scanDocument(item: QuickItem, options: ScanOptions, signal: AbortSignal): Promise<QuickItem> {
  if (item.source.kind !== 'image') throw new Error('SCAN_IMAGE_REQUIRED')
  let source: HTMLCanvasElement | undefined, result: HTMLCanvasElement | undefined, rotated: HTMLCanvasElement | undefined
  try {
    signal.throwIfAborted()
    source = await loadScanCanvas(item.source); signal.throwIfAborted()
    const geometry = scanGeometry(options.corners, source.width, source.height)
    result = document.createElement('canvas'); result.width = geometry.width; result.height = geometry.height
    const context = result.getContext('2d', { willReadFrequently: true })!
    const input = source.getContext('2d')!.getImageData(0, 0, source.width, source.height), output = context.createImageData(result.width, result.height)
    const pixel = (x: number, y: number, c: number) => x < 0 || y < 0 || x >= source!.width || y >= source!.height ? 255 : input.data[(y * source!.width + x) * 4 + c]
    for (let y = 0; y < result.height; y++) {
      if (y % 32 === 0) { await pause(); signal.throwIfAborted() }
      for (let x = 0; x < result.width; x++) {
        const index = (y * result.width + x) * 4
        if (x < geometry.padding || y < geometry.padding || x >= result.width - geometry.padding || y >= result.height - geometry.padding) {
          output.data.set([255, 255, 255, 255], index); continue
        }
        const p = transformPoint(geometry.toSource, { x, y }), sx = Math.floor(p.x), sy = Math.floor(p.y), fx = p.x - sx, fy = p.y - sy
        const channels = [0, 1, 2].map(c => (pixel(sx, sy, c) * (1 - fx) + pixel(sx + 1, sy, c) * fx) * (1 - fy) + (pixel(sx, sy + 1, c) * (1 - fx) + pixel(sx + 1, sy + 1, c) * fx) * fy)
        output.data.set([...scanColor(channels[0], channels[1], channels[2], options.preset), 255], index)
      }
    }
    context.putImageData(output, 0, 0)
    const skew = options.deskew ? estimateSkew(sampledGray(result)) ?? 0 : 0
    if (options.rotation || skew) {
      const rotation = expandedRotation(result.width, result.height, options.rotation - skew)
      const scale = Math.min(1, Math.sqrt(SCAN_MAX_PIXELS / (rotation.width * rotation.height)))
      rotated = document.createElement('canvas'); rotated.width = Math.ceil(rotation.width * scale); rotated.height = Math.ceil(rotation.height * scale)
      const context = rotated.getContext('2d')!, m = rotation.fromOriginal
      context.fillStyle = 'white'; context.fillRect(0, 0, rotated.width, rotated.height)
      context.setTransform(m[0] * scale, m[3] * scale, m[1] * scale, m[4] * scale, m[2] * scale, m[5] * scale); context.drawImage(result, 0, 0)
    }
    signal.throwIfAborted()
    const blob = await new Promise<Blob>((resolve, reject) => (rotated ?? result!).toBlob(blob => blob ? resolve(blob) : reject(new Error('SCAN_ENCODE')), 'image/png'))
    signal.throwIfAborted()
    const bytes = new Uint8Array(await blob.arrayBuffer()), id = newId()
    return { source: { id, originId: item.source.id, name: item.source.name, kind: 'image', mime: 'image/png', bytes, size: bytes.byteLength, pageCount: 1 }, pages: [{ ...item.pages[0], sourceId: id, rotation: 0 }] }
  } finally { for (const canvas of [source, result, rotated]) if (canvas) { canvas.width = 1; canvas.height = 1 } }
}
