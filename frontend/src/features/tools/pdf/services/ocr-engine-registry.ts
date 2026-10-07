import { HANDWRITING_RECOGNITION_AVAILABLE } from '../../hub/config/tool-capabilities'

export const OCR_ENGINES = [{ id: 'tesseract', version: '7.0.0/vie-4.0.0_best_int', supported: ['printed', 'numeric', 'table', 'form'], available: true },
  { id: 'vietocr', version: null, supported: ['handwriting'], available: HANDWRITING_RECOGNITION_AVAILABLE, reason: 'WEIGHTS_AND_BROWSER_VALIDATION_REQUIRED' }] as const

export const handwritingAvailable = () => OCR_ENGINES.some(engine => engine.id === 'vietocr' && engine.available)
