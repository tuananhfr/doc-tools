import { beforeEach, describe, expect, it, vi } from 'vitest'
import { portraitMask } from './portrait-mask'

const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  pixels: new Uint8ClampedArray(320 * 320 * 4).fill(255),
  release: vi.fn(),
}))
vi.mock('./ai-background-removal', () => ({ removeBackgroundWithAi: mocks.remove }))
vi.mock('./image-codec', () => ({
  createCanvas: () => ({ canvas: {}, context: { drawImage: vi.fn(), getImageData: () => ({ data: mocks.pixels }) } }),
  releaseCanvas: mocks.release,
}))
const bitmap = { width: 900, height: 1200 } as ImageBitmap
const mask = new Uint8Array(320 * 320).fill(255)
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => { vi.clearAllMocks(); mocks.pixels.fill(255) })

describe('portrait subject mask', () => {
  it('shares inference and its completed mask between preview, recoloring, crop and export', async () => {
    const pending = deferred<Uint8Array>(), source = new Blob(['portrait'])
    mocks.remove.mockReturnValueOnce(pending.promise)
    const preview = portraitMask(source, bitmap), exported = portraitMask(source, bitmap)
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    pending.resolve(mask)
    expect(await preview).toBe(mask)
    expect(await exported).toBe(mask)
    expect(await portraitMask(source, bitmap)).toBe(mask)
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(mocks.release).toHaveBeenCalledTimes(1)
  })

  it('does not reuse a previous person’s mask for another file', async () => {
    mocks.remove.mockResolvedValue(mask)
    await portraitMask(new Blob(['first']), bitmap)
    await portraitMask(new Blob(['second']), bitmap)
    expect(mocks.remove).toHaveBeenCalledTimes(2)
  })

  it('keeps an existing transparent cutout without running inference', async () => {
    mocks.pixels[3] = 0
    expect(await portraitMask(new Blob(['cutout']), bitmap)).toBeNull()
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledTimes(1)
  })

  it('allows retry after model loading fails instead of caching a rejected result', async () => {
    const source = new Blob(['portrait'])
    mocks.remove.mockRejectedValueOnce(new Error('MODEL_LOAD')).mockResolvedValueOnce(mask)
    await expect(portraitMask(source, bitmap)).rejects.toThrow('MODEL_LOAD')
    expect(await portraitMask(source, bitmap)).toBe(mask)
    expect(mocks.remove).toHaveBeenCalledTimes(2)
  })

  it('canceling an export does not terminate inference still needed by the preview', async () => {
    const pending = deferred<Uint8Array>(), source = new Blob(['portrait']), controller = new AbortController()
    mocks.remove.mockReturnValueOnce(pending.promise)
    const preview = portraitMask(source, bitmap), exported = portraitMask(source, bitmap, controller.signal)
    const canceled = expect(exported).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await canceled
    expect(mocks.remove.mock.calls[0][1].aborted).toBe(false)
    pending.resolve(mask)
    expect(await preview).toBe(mask)
  })

  it('terminates unused inference when the photo is removed and permits a new request', async () => {
    const source = new Blob(['portrait']), controller = new AbortController(), pending = deferred<Uint8Array>()
    mocks.remove.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(mask)
    const preview = portraitMask(source, bitmap, controller.signal)
    const canceled = expect(preview).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await canceled
    expect(mocks.remove.mock.calls[0][1].aborted).toBe(true)
    pending.reject(new DOMException('Aborted', 'AbortError'))
    expect(await portraitMask(source, bitmap)).toBe(mask)
    expect(mocks.remove).toHaveBeenCalledTimes(2)
  })
})
