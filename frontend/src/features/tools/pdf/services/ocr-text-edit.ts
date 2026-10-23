import type { FlowResult } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import type { ImageSheet } from '../types/doc-tools.types'
import { buildOcrTextPdf } from './ocr-text-pdf'

/** Rebuild the actual downloadable PDF; editing does not rerun OCR or alter its cached raw reading. */
export async function editOcrTextPdf(result: FlowResult, pages: string[], sheet: ImageSheet, signal: AbortSignal): Promise<FlowResult> {
  signal.throwIfAborted()
  if (!pages.length || !pages.some(page => page.trim())) throw new Error(translate('ocr:empty'))
  const texts = pages.map(page => page.normalize('NFC'))
  const built = await buildOcrTextPdf(texts, sheet, signal)
  signal.throwIfAborted()
  return { ...result, output: { ...result.output, blob: built.blob, detail: translate('pdf:stage.pageCount', { count: built.pages }) }, text: texts.join('\n\n'), textPages: texts }
}
