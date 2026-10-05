import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { Size } from '../utils/page-geometry'
import { basePageSize } from './page-size'
import { renderPdfPage } from './pdf-render'
import { renderSheet } from './pdf-to-image'

/** 100% = đúng khổ in trên màn hình 96 DPI (1 pt = 96/72 px CSS), trang ảnh cũng vậy vì nó là tờ giấy. */
export const PDF_CSS_SCALE = 96 / 72

/** Trần canvas của iOS Safari ~16,7 triệu điểm ảnh — vượt là ra canvas trắng, không báo lỗi. */
export const PREVIEW_MAX_AREA = 16_000_000

export type PageSize = Size

/** Kích thước trang ở 100% (px CSS), đã tính cả xoay gốc lẫn xoay thêm. Trang ảnh là tờ giấy như lúc xuất. */
export async function measurePage(source: SourceFile, ref: PageRef): Promise<PageSize> {
  const base = await basePageSize(source, ref)
  const sideways = ref.rotation === 90 || ref.rotation === 270
  const width = base.width * PDF_CSS_SCALE
  const height = base.height * PDF_CSS_SCALE
  return sideways ? { width: height, height: width } : { width, height }
}

/** `pixelRatio` = số điểm ảnh canvas trên mỗi px CSS của trang ở 100%. */
export async function renderPreview(source: SourceFile, ref: PageRef, pixelRatio: number): Promise<HTMLCanvasElement> {
  if (source.kind !== 'pdf') return renderSheet(source, ref.sheet, ref.rotation, PDF_CSS_SCALE * pixelRatio, PREVIEW_MAX_AREA)
  return renderPdfPage(source, ref.pageIndex, {
    scale: PDF_CSS_SCALE * pixelRatio,
    extraRotation: ref.rotation,
    maxArea: PREVIEW_MAX_AREA,
  })
}
