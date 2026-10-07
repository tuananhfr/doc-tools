import type { TextRun, Quad } from './text-layer.types'
import type { OcrMatrix, OcrPass, OcrProfile } from './ocr-profile.types'
import type { OcrLayout, OcrValidation } from './ocr-layout.types'

export type OcrConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type OcrQualityFlag = 'low-resolution' | 'low-contrast' | 'blur' | 'blank' | 'glare' | 'skew' | 'perspective' | 'handwriting-unsupported'

export interface OcrCandidate {
  id: string
  engine: string
  engineVersion: string
  pass: OcrPass
  rawText: string
  score: number
  bbox: Quad
}

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
  candidates?: OcrCandidate[]
  reviewReasons?: ('disagreement' | 'unreadable' | 'critical' | 'unmatched')[]
  status?: 'READABLE' | 'UNREADABLE'
}

export interface OcrPageResult {
  sourceId: string
  pageIndex: number
  sourceHash: string | null
  engine: 'tesseract'
  engineVersion: string
  pass: OcrPass
  words: OcrWordResult[]
  qualityFlags: OcrQualityFlag[]
  pipeline?: { version: string; profile: OcrProfile; fingerprint: string; rotation: number; passes: { id: OcrPass; toOriginal: OcrMatrix; operations?: OcrPass[]; crops?: { targetWordId: string; toOriginal: OcrMatrix }[] }[] }
  layout?: OcrLayout
  validations?: OcrValidation[]
}
