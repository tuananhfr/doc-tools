import * as ort from 'onnxruntime-web/wasm'
import type { BackgroundRemovalRequest, BackgroundRemovalResponse } from '../types/background-removal.types'
import { normalizeBackgroundAlpha } from '../services/background-removal-input'
import model from '../services/background-removal-model.json'

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<BackgroundRemovalRequest>) => void) | null
  postMessage: (message: BackgroundRemovalResponse, transfer?: Transferable[]) => void
}

scope.onmessage = async ({ data }) => {
  let session: ort.InferenceSession | undefined
  let input: ort.Tensor | undefined
  let outputs: ort.InferenceSession.ReturnType | undefined
  let phase: 'loading' | 'processing' = 'loading'
  try {
    scope.postMessage({ type: 'progress', phase })
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    ort.env.wasm.wasmPaths = data.runtimeUrl
    const response = await fetch(data.modelUrl, { credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new Error('MODEL_LOAD')
    const bytes = await response.arrayBuffer()
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('')
    if (digest !== data.modelSha256) throw new Error('MODEL_CHECKSUM')
    session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
    phase = 'processing'
    scope.postMessage({ type: 'progress', phase })
    input = new ort.Tensor('float32', data.pixels, [1, 3, model.inputSize, model.inputSize])
    outputs = await session.run({ [session.inputNames[0]]: input }, [session.outputNames[0]])
    const prediction = outputs[session.outputNames[0]].data
    if (!(prediction instanceof Float32Array)) throw new Error('INVALID_MODEL_OUTPUT')
    const alpha = normalizeBackgroundAlpha(prediction)
    scope.postMessage({ type: 'result', alpha }, [alpha.buffer])
  } catch {
    scope.postMessage({ type: 'error', code: phase === 'loading' ? 'MODEL_LOAD' : 'PROCESSING_FAILED' })
  } finally {
    if (outputs) for (const output of Object.values(outputs)) output.dispose()
    input?.dispose()
    await session?.release()
  }
}
