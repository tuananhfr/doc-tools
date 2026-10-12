import { withBase } from '@/utils/url'
import voice from '../config/piper-voice.json'
import type { PiperAssetRequest, PiperErrorCode, PiperWorkerRequest, PiperWorkerResponse } from '../types/piper-tts.types'

/** Lần đầu phải tải cả mô hình giọng + bộ phiên âm + ONNX Runtime (dùng chung với công cụ xoá phông). */
export const PIPER_DOWNLOAD_BYTES = voice.model.bytes + voice.phonemizer.wasm.bytes + voice.phonemizer.data.bytes + voice.runtimeBytes
export const PIPER_SAMPLE_RATE = voice.sampleRate

const LOAD_TIMEOUT_MS = 300_000
const SYNTH_TIMEOUT_MS = 60_000

export class PiperTtsError extends Error {
  constructor(public readonly code: PiperErrorCode) { super(code) }
}

export interface PiperSynth {
  synthesize(text: string, lengthScale: number): Promise<Float32Array<ArrayBuffer>>
  dispose(): void
}

export function piperSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly === 'object' && typeof AudioContext !== 'undefined' && Boolean(globalThis.crypto?.subtle)
}

const absolute = (path: string) => new URL(withBase(path), window.location.href).href
const asset = (path: string, meta: { sha256: string; bytes: number }): PiperAssetRequest => ({ url: absolute(path), sha256: meta.sha256, bytes: meta.bytes })

/** Nạp giọng trong một worker riêng; `dispose()` kết thúc worker để trả lại heap WASM (~300 MB). */
export function loadPiperSynth(signal: AbortSignal, onProgress: (loaded: number, total: number) => void): Promise<PiperSynth> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  if (!piperSupported()) return Promise.reject(new PiperTtsError('UNSUPPORTED'))
  let worker: Worker
  try { worker = new Worker(new URL('../workers/piper-tts.worker.ts', import.meta.url), { type: 'module', name: 'piper-tts' }) }
  catch { return Promise.reject(new PiperTtsError('UNSUPPORTED')) }

  const pending = new Map<number, { resolve: (pcm: Float32Array<ArrayBuffer>) => void; reject: (error: unknown) => void; timer: number }>()
  let nextId = 0
  let disposed = false
  const failAll = (error: unknown) => {
    for (const job of pending.values()) { window.clearTimeout(job.timer); job.reject(error) }
    pending.clear()
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    signal.removeEventListener('abort', abort)
    worker.terminate()
    failAll(new DOMException('Aborted', 'AbortError'))
  }
  const abort = () => dispose()
  signal.addEventListener('abort', abort, { once: true })

  const synth: PiperSynth = {
    synthesize(text, lengthScale) {
      if (disposed) return Promise.reject(new DOMException('Aborted', 'AbortError'))
      const id = nextId++
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => { pending.delete(id); dispose(); reject(new PiperTtsError('TIMEOUT')) }, SYNTH_TIMEOUT_MS)
        pending.set(id, { resolve, reject, timer })
        const request: PiperWorkerRequest = { type: 'synthesize', id, text, lengthScale }
        worker.postMessage(request)
      })
    },
    dispose,
  }

  return new Promise((resolve, reject) => {
    const loadTimer = window.setTimeout(() => { dispose(); reject(new PiperTtsError('TIMEOUT')) }, LOAD_TIMEOUT_MS)
    signal.addEventListener('abort', () => { window.clearTimeout(loadTimer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    worker.onmessage = ({ data }: MessageEvent<PiperWorkerResponse>) => {
      if (data.type === 'progress') { onProgress(data.loaded, data.total); return }
      if (data.type === 'ready') { window.clearTimeout(loadTimer); resolve(synth); return }
      if (data.type === 'audio') {
        const job = pending.get(data.id)
        if (!job) return
        window.clearTimeout(job.timer); pending.delete(data.id); job.resolve(data.pcm)
        return
      }
      if (data.id === undefined) { window.clearTimeout(loadTimer); dispose(); reject(new PiperTtsError(data.code)); return }
      const job = pending.get(data.id)
      if (!job) return
      window.clearTimeout(job.timer); pending.delete(data.id); job.reject(new PiperTtsError(data.code))
    }
    worker.onerror = (event) => {
      event.preventDefault()
      window.clearTimeout(loadTimer)
      failAll(new PiperTtsError('PROCESSING_FAILED'))
      dispose()
      reject(new PiperTtsError('MODEL_LOAD'))
    }
    const request: PiperWorkerRequest = {
      type: 'load',
      model: asset(`/vendor/tts/${voice.model.file}`, voice.model),
      phonemizerWasm: asset(`/vendor/tts/piper-phonemize-${voice.phonemizer.version}/${voice.phonemizer.wasm.file}`, voice.phonemizer.wasm),
      phonemizerData: asset(`/vendor/tts/piper-phonemize-${voice.phonemizer.version}/${voice.phonemizer.data.file}`, voice.phonemizer.data),
      runtimeUrl: absolute(voice.runtimeDir),
    }
    worker.postMessage(request)
  })
}
