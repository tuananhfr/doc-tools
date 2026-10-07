import type { TextRun, Quad } from './text-layer.types'

export type OcrConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type OcrQualityFlag = 'low-resolution' | 'low-contrast' | 'blur' | 'blank'

export interface OcrWordResult {
  id: string
  rawText: string
  normalizedText: string
  confidence: number
  confidenceLevel: OcrConfidence
  bbox: Quad
  previewBox: { x: number; y: number; width: number; height: number }
  contentType: 'text' | 'numeric'
  run: TextRun
  verifiedValue: string | null
  verifiedAt: string | null
  verifiedBy: 'local-user' | null
}

export interface OcrPageResult {
  sourceId: string
  pageIndex: number
  sourceHash: string | null
  engine: 'tesseract'
  engineVersion: string
  pass: 'original'
  words: OcrWordResult[]
  qualityFlags: OcrQualityFlag[]
}
