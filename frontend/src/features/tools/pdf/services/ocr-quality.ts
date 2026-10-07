import type { SourceFile } from '../types/doc-tools.types'
import { ocrQuality } from '../utils/ocr-quality'
import { toGray } from '../utils/scan-analysis'

export async function inspectOcrImage(canvas: HTMLCanvasElement, source: SourceFile) {
  const sample = document.createElement('canvas')
  const scale = Math.min(1, 768 / Math.max(canvas.width, canvas.height))
  sample.width = Math.max(1, Math.round(canvas.width * scale))
  sample.height = Math.max(1, Math.round(canvas.height * scale))
  const context = sample.getContext('2d', { willReadFrequently: true })!
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  let nativeSize: { width: number; height: number } | undefined
  if (source.kind === 'image' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
      nativeSize = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
    } catch { /* Native dimensions are optional; the rendered pixels remain usable. */ }
  }
  return ocrQuality(toGray(context.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height), nativeSize)
}

const hashes = new WeakMap<SourceFile, Promise<string | null>>()
export function ocrSourceHash(source: SourceFile): Promise<string | null> {
  let result = hashes.get(source)
  if (!result) {
    result = (async () => {
      if (!globalThis.crypto?.subtle) return null
      if (source.kind === 'collage') {
        const parts = await Promise.all(source.parts.map(part => ocrSourceHash(part.source)))
        if (parts.some(value => value === null)) return null
        const bytes = new TextEncoder().encode(JSON.stringify(parts.map((hash, i) => ({ hash, rotation: source.parts[i].rotation }))))
        return hex(await crypto.subtle.digest('SHA-256', bytes))
      }
      return hex(await crypto.subtle.digest('SHA-256', source.bytes))
    })().catch(() => null)
    hashes.set(source, result)
  }
  return result
}
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('')
