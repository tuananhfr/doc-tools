import type { Size } from '../types/image.types'
import { removeBackgroundWithAi } from './ai-background-removal'
import { normalizeBackgroundInput } from './background-removal-input'
import model from './background-removal-model.json'
import { createCanvas, releaseCanvas } from './image-codec'

interface MaskJob {
  controller: AbortController
  promise: Promise<Uint8Array | null>
  consumers: number
  settled: boolean
}

// The mask belongs to the original image, independently of crop, color and lighting.
// Weak keys release it with the selected file; preview and export share pending work.
const masks = new WeakMap<Blob, MaskJob>()
const abortError = () => new DOMException('Aborted', 'AbortError')

function startMask(bitmap: CanvasImageSource & Size, controller: AbortController): Promise<Uint8Array | null> {
  const small = createCanvas({ width: model.inputSize, height: model.inputSize })
  try {
    small.context.imageSmoothingQuality = 'high'
    small.context.drawImage(bitmap, 0, 0, model.inputSize, model.inputSize)
    const pixels = small.context.getImageData(0, 0, model.inputSize, model.inputSize).data
    // An existing cutout already provides its own matte. Keep those transparent edges.
    for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] < 255) return Promise.resolve(null)
    return removeBackgroundWithAi(normalizeBackgroundInput(pixels), controller.signal, () => {})
  } finally { releaseCanvas(small.canvas) }
}

/** Semantic foreground alpha at model resolution; null means use the source alpha. */
export function portraitMask(source: Blob, bitmap: CanvasImageSource & Size, signal?: AbortSignal): Promise<Uint8Array | null> {
  if (signal?.aborted) return Promise.reject(abortError())
  let job = masks.get(source)
  if (!job) {
    const controller = new AbortController()
    const created: MaskJob = { controller, promise: Promise.resolve(null), consumers: 0, settled: false }
    try { created.promise = startMask(bitmap, controller) } catch (error) { return Promise.reject(error) }
    created.promise = created.promise.then(alpha => {
      created.settled = true
      return alpha
    }, error => {
      created.settled = true
      if (masks.get(source) === created) masks.delete(source)
      throw error
    })
    masks.set(source, created)
    job = created
  }
  const shared = job
  shared.consumers++
  return new Promise((resolve, reject) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      signal?.removeEventListener('abort', abort)
      shared.consumers--
      if (!shared.settled && shared.consumers === 0) {
        if (masks.get(source) === shared) masks.delete(source)
        shared.controller.abort()
      }
    }
    const abort = () => { release(); reject(abortError()) }
    signal?.addEventListener('abort', abort, { once: true })
    shared.promise.then(alpha => {
      if (released) return
      release(); resolve(alpha)
    }, error => {
      if (released) return
      release(); reject(error)
    })
  })
}

/** Crop the full-image matte with exactly the same coordinates as the photograph. */
export function applyPortraitMask(context: CanvasRenderingContext2D, alpha: Uint8Array, source: Size, rect: { x: number; y: number; width: number; height: number }, target: Size) {
  const mask = createCanvas({ width: model.inputSize, height: model.inputSize })
  try {
    const pixels = mask.context.createImageData(model.inputSize, model.inputSize)
    for (let index = 0; index < alpha.length; index++) {
      pixels.data[index * 4] = pixels.data[index * 4 + 1] = pixels.data[index * 4 + 2] = 255
      pixels.data[index * 4 + 3] = alpha[index]
    }
    mask.context.putImageData(pixels, 0, 0)
    context.globalCompositeOperation = 'destination-in'
    context.imageSmoothingQuality = 'high'
    context.drawImage(mask.canvas, rect.x / source.width * model.inputSize, rect.y / source.height * model.inputSize, rect.width / source.width * model.inputSize, rect.height / source.height * model.inputSize, 0, 0, target.width, target.height)
  } finally { context.globalCompositeOperation = 'source-over'; releaseCanvas(mask.canvas) }
}
