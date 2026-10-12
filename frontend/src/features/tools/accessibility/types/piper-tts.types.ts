export interface PiperAssetRequest {
  url: string
  sha256: string
  bytes: number
}

export type PiperWorkerRequest =
  | { type: 'load'; model: PiperAssetRequest; phonemizerWasm: PiperAssetRequest; phonemizerData: PiperAssetRequest; runtimeUrl: string }
  | { type: 'synthesize'; id: number; text: string; lengthScale: number }

export type PiperErrorCode = 'MODEL_LOAD' | 'PROCESSING_FAILED' | 'UNSUPPORTED' | 'TIMEOUT'

export type PiperWorkerResponse =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'audio'; id: number; pcm: Float32Array<ArrayBuffer> }
  | { type: 'error'; id?: number; code: PiperErrorCode }
