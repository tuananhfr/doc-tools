import * as ort from 'onnxruntime-web/wasm'
import createPiperPhonemize from '@diffusionstudio/piper-wasm/build/piper_phonemize.js'
import voice from '../config/piper-voice.json'
import type { PiperAssetRequest, PiperWorkerRequest, PiperWorkerResponse } from '../types/piper-tts.types'

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<PiperWorkerRequest>) => void) | null
  postMessage: (message: PiperWorkerResponse, transfer?: Transferable[]) => void
}

let session: ort.InferenceSession | undefined
let phonemize: ((text: string) => number[]) | undefined
// ort-web không cho chạy song song trên một session; xếp hàng mọi lượt sinh âm thanh.
let queue: Promise<void> = Promise.resolve()

async function fetchVerified(asset: PiperAssetRequest, onBytes: (bytes: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(asset.url, { credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok || !response.body) throw new Error('MODEL_LOAD')
  const reader = response.body.getReader()
  const bytes = new Uint8Array(asset.bytes)
  let offset = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (offset + value.length > bytes.length) throw new Error('MODEL_LOAD')
    bytes.set(value, offset)
    offset += value.length
    onBytes(value.length)
  }
  if (offset !== bytes.length) throw new Error('MODEL_LOAD')
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (value) => value.toString(16).padStart(2, '0')).join('')
  if (digest !== asset.sha256) throw new Error('MODEL_CHECKSUM')
  return bytes.buffer
}

async function load(request: Extract<PiperWorkerRequest, { type: 'load' }>): Promise<void> {
  const total = request.model.bytes + request.phonemizerWasm.bytes + request.phonemizerData.bytes
  let loaded = 0
  const onBytes = (bytes: number) => { loaded += bytes; scope.postMessage({ type: 'progress', loaded, total }) }
  const [model, wasmBinary, data] = await Promise.all([request.model, request.phonemizerWasm, request.phonemizerData].map((asset) => fetchVerified(asset, onBytes)))
  let captured: number[] | undefined
  // Emscripten dò môi trường bằng `importScripts`, thứ không có trong module worker; đưa sẵn byte
  // qua `wasmBinary` + `getPreloadedPackage` để nó không phải tự tải (và tự đoán sai cách tải).
  const module = await createPiperPhonemize({
    print: (line) => { try { captured = JSON.parse(line).phoneme_ids } catch { /* dòng log của espeak, không phải kết quả */ } },
    printErr: () => {},
    wasmBinary,
    getPreloadedPackage: () => data,
    locateFile: (file) => file,
  })
  phonemize = (text) => {
    captured = undefined
    module.callMain(['-l', voice.espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data'])
    if (!Array.isArray(captured)) throw new Error('PHONEMIZE')
    return captured
  }
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = request.runtimeUrl
  session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
}

async function synthesize(text: string, lengthScale: number): Promise<Float32Array<ArrayBuffer>> {
  if (!session || !phonemize) throw new Error('NOT_READY')
  const ids = phonemize(text)
  if (!ids.length) return new Float32Array(0)
  const feeds = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([voice.noiseScale, lengthScale, voice.noiseW]), [3]),
  }
  const outputs = await session.run(feeds)
  try {
    const data = outputs[session.outputNames[0]].data
    if (!(data instanceof Float32Array)) throw new Error('INVALID_MODEL_OUTPUT')
    return new Float32Array(data)
  } finally {
    for (const tensor of [...Object.values(feeds), ...Object.values(outputs)]) tensor.dispose()
  }
}

scope.onmessage = ({ data }) => {
  if (data.type === 'load') {
    queue = queue.then(() => load(data))
      .then(() => scope.postMessage({ type: 'ready' }))
      .catch(() => scope.postMessage({ type: 'error', code: 'MODEL_LOAD' }))
    return
  }
  queue = queue.then(() => synthesize(data.text, data.lengthScale))
    .then((pcm) => scope.postMessage({ type: 'audio', id: data.id, pcm }, [pcm.buffer]))
    .catch(() => scope.postMessage({ type: 'error', id: data.id, code: 'PROCESSING_FAILED' }))
}
