export type BackgroundRemovalPhase = 'loading' | 'processing'

export interface BackgroundRemovalRequest {
  pixels: Float32Array
  modelUrl: string
  runtimeUrl: string
  modelSha256: string
}

export type BackgroundRemovalResponse =
  | { type: 'progress'; phase: BackgroundRemovalPhase }
  | { type: 'result'; alpha: Uint8Array }
  | { type: 'error'; code: 'MODEL_LOAD' | 'PROCESSING_FAILED' }

export type BackgroundRemovalErrorCode = 'MODEL_LOAD' | 'PROCESSING_FAILED' | 'UNSUPPORTED' | 'TIMEOUT'
