import { withBase } from '@/utils/url'
import type { BackgroundRemovalErrorCode, BackgroundRemovalPhase, BackgroundRemovalRequest, BackgroundRemovalResponse } from '../types/background-removal.types'
import model from './background-removal-model.json'

export class BackgroundRemovalError extends Error {
  constructor(public readonly code: BackgroundRemovalErrorCode) { super(code) }
}

export function removeBackgroundWithAi(pixels: Float32Array, signal: AbortSignal, onProgress: (phase: BackgroundRemovalPhase) => void): Promise<Uint8Array> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  if (typeof Worker === 'undefined') return Promise.reject(new BackgroundRemovalError('UNSUPPORTED'))
  return new Promise((resolve, reject) => {
    let worker: Worker
    try { worker = new Worker(new URL('../workers/background-removal.worker.ts', import.meta.url), { type: 'module', name: 'background-removal' }) }
    catch { reject(new BackgroundRemovalError('UNSUPPORTED')); return }
    const cleanup = () => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      // Releasing a session keeps the WASM heap alive; ending its worker releases the realm.
      worker.terminate()
    }
    const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')) }
    const timeout = setTimeout(() => { cleanup(); reject(new BackgroundRemovalError('TIMEOUT')) }, 180_000)
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = ({ data }: MessageEvent<BackgroundRemovalResponse>) => {
      if (data.type === 'progress') { onProgress(data.phase); return }
      cleanup()
      if (data.type === 'error') reject(new BackgroundRemovalError(data.code))
      else resolve(data.alpha)
    }
    worker.onerror = event => { event.preventDefault(); cleanup(); reject(new BackgroundRemovalError('PROCESSING_FAILED')) }
    const request: BackgroundRemovalRequest = {
      pixels,
      modelUrl: new URL(withBase(`/vendor/background-removal/${model.file}`), window.location.href).href,
      runtimeUrl: new URL(withBase(`/vendor/background-removal/ort-${model.runtimeVersion}/`), window.location.href).href,
      modelSha256: model.sha256,
    }
    worker.postMessage(request, [pixels.buffer])
  })
}
