import type { Quad } from './text-layer.types'

export type OcrProfile = 'printed' | 'numeric' | 'table' | 'form' | 'handwriting' | 'mixed'
export type OcrPass = 'original' | 'contrast' | 'deskew' | 'threshold' | 'blue-ink' | 'red-ink' | 'grid' | 'perspective' | 'numeric'
export type OcrMatrix = readonly [number, number, number, number, number, number, number, number, number]

export interface OcrPipelineOptions {
  profile: OcrProfile
  maxPasses: 1 | 2 | 3
  perspective?: Quad
}

export const OCR_PIPELINE_VERSION = '2.0.0'
export const DEFAULT_OCR_OPTIONS: OcrPipelineOptions = { profile: 'printed', maxPasses: 2 }
