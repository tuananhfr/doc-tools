import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { imagePixelSize, sheetLayoutOf } from './page-size'
import { PDF_CSS_SCALE } from './page-preview'

/** 300 DPI for vector PDFs; photographs never gain detail by being enlarged to that size. */
export async function ocrRenderScale(source: SourceFile, page: PageRef): Promise<number> {
  let pixelsPerPoint = 300 / 72
  if (source.kind === 'image') {
    const [native, layout] = await Promise.all([imagePixelSize(source), sheetLayoutOf(source, page.sheet)])
    const slot = layout.slots[0]
    pixelsPerPoint = Math.min(pixelsPerPoint, native.width / slot.width, native.height / slot.height)
  }
  return pixelsPerPoint / PDF_CSS_SCALE
}
