import { describe, expect, it } from 'vitest'
import { awaitOcrJob } from './ocr-abort'

describe('OCR worker cancellation', () => {
  it('rejects a terminated job even when the worker never settles its promise', async () => {
    const abort = new AbortController(), waiting = awaitOcrJob(new Promise(() => undefined), abort.signal)
    abort.abort()
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('preserves results and errors from jobs that settle before cancellation', async () => {
    const abort = new AbortController()
    expect(await awaitOcrJob(Promise.resolve('text'), abort.signal)).toBe('text')
    await expect(awaitOcrJob(Promise.reject(new Error('MODEL_ERROR')), abort.signal)).rejects.toThrow('MODEL_ERROR')
  })
})
