import type { OcrPageResult, OcrWordResult } from '../types/ocr-result.types'
import type { PageText, Quad } from '../types/text-layer.types'
import { ocrRuns, type OcrLine } from './ocr-runs'
import type { Point } from './page-geometry'
import { validateOcrFields, validateOcrTable } from './ocr-validation'

export function ocrWords(lines: OcrLine[], pxPerPt: number, toBase: (point: Point) => Point, size: { width: number; height: number }): OcrWordResult[] {
  const runs = ocrRuns(lines, pxPerPt, toBase, 0)
  let offset = 0
  return lines.flatMap((line, lineIndex) => line.words.flatMap((word, wordIndex) => {
    if (!word.text.trim() || word.confidence < 0) return []
    const { x0, y0, x1, y1 } = word.bbox
    const bbox: Quad = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].map(point => toBase({ x: point.x / pxPerPt, y: point.y / pxPerPt })) as Quad
    const normalizedText = word.text.trim().normalize('NFC')
    const confidence = Number.isFinite(word.confidence) ? Math.max(0, Math.min(100, word.confidence)) : 0
    return [{
      id: `${lineIndex}:${wordIndex}`, rawText: word.text, normalizedText, confidence,
      confidenceLevel: confidence >= 85 ? 'HIGH' : confidence >= 60 ? 'MEDIUM' : 'LOW',
      bbox, previewBox: { x: x0 / size.width, y: y0 / size.height, width: (x1 - x0) / size.width, height: (y1 - y0) / size.height },
      contentType: /\p{N}/u.test(normalizedText) ? 'numeric' : 'text', run: runs[offset++],
      verifiedValue: null, verifiedAt: null, verifiedBy: null,
    } satisfies OcrWordResult]
  }))
}

export const needsOcrReview = (word: OcrWordResult): boolean => word.verifiedValue === null && (word.confidenceLevel !== 'HIGH' || word.contentType === 'numeric' || Boolean(word.reviewReasons?.length) || word.status === 'UNREADABLE')

export function confirmOcrWord(word: OcrWordResult, value: string, at = new Date().toISOString()): OcrWordResult {
  return { ...word, verifiedValue: value.trim().normalize('NFC'), verifiedAt: at, verifiedBy: 'local-user' }
}

/** Keep provenance while rebuilding the text layer from the reviewed values. */
export function reviewedPageText(ocr: OcrPageResult): PageText {
  if (ocr.words.some(needsOcrReview)) throw new Error('OCR_REVIEW_REQUIRED')
  if ([...validateOcrFields(ocr.layout?.fields ?? []), ...(ocr.layout?.tables ?? []).flatMap(validateOcrTable)].some(finding => finding.severity === 'error')) throw new Error('OCR_LAYOUT_REVIEW_REQUIRED')
  const runs = ocr.words.flatMap(word => {
    const text = word.verifiedValue ?? word.normalizedText
    return text ? [{ ...word.run, text, eol: false }] : []
  })
  const original = ocr.words.filter(word => (word.verifiedValue ?? word.normalizedText) !== '')
  // A discarded final word must not join two original lines in the exported text.
  for (let index = 0; index < runs.length; index++) {
    runs[index].eol = index === runs.length - 1 || original[index].id.split(':')[0] !== original[index + 1]?.id.split(':')[0]
  }
  return { runs, ocr }
}
