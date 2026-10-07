import type { OcrPipelineOptions } from '../types/ocr-profile.types'
import { handwritingAvailable } from './ocr-engine-registry'

export function routeOcr(options: OcrPipelineOptions) {
  return { engine: 'tesseract' as const, requiresFullReview: options.profile === 'mixed' || options.profile === 'handwriting',
    handwritingUnsupported: (options.profile === 'mixed' || options.profile === 'handwriting') && !handwritingAvailable() }
}
