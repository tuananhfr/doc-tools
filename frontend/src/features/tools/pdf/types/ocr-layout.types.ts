import type { Quad } from './text-layer.types'
import type { OcrPass } from './ocr-profile.types'

export type OcrRegionKind = 'block' | 'line' | 'table' | 'form' | 'signature' | 'unknown'
export type OcrFieldKind = 'text' | 'money' | 'date' | 'identifier'
export interface OcrRegion { id: string; kind: OcrRegionKind; bbox: Quad; wordIds: string[] }
export interface OcrVerification { value: string; at: string; by: 'local-user' }
export interface OcrCell {
  id: string
  row: number
  column: number
  rowSpan: number
  columnSpan: number
  bbox: Quad
  wordIds: string[]
  rawText: string
  verified: OcrVerification | null
  proposal?: { value: string; pass: OcrPass; candidateIds: string[] }
}
export interface OcrTable {
  id: string
  rows: number
  columns: number
  cells: OcrCell[]
  origin: 'ruled' | 'geometry' | 'manual'
  verifiedAt: string | null
}
export interface OcrField {
  id: string
  label: string
  kind: OcrFieldKind
  required: boolean
  wordIds: string[]
  rawText: string
  verified: OcrVerification | null
  draftValue?: string
}
export interface OcrValidation {
  id: string
  targetId: string
  code: 'required' | 'invalid-date' | 'ambiguous-money' | 'invalid-money' | 'sum-mismatch' | 'duplicate' | 'unverified' | 'unreadable'
  severity: 'warning' | 'error'
}
export interface OcrLayout {
  regions: OcrRegion[]
  tables: OcrTable[]
  fields: OcrField[]
  template?: { id: string; version: string }
}
