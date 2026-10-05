import type { CollagePart, ImageSheet, ImageSource, PageRef, SheetSource, SourceFile } from '../types/doc-tools.types'
import { layoutSheet, rotatedSize, type SheetLayout } from '../utils/image-sheet'
import type { Size } from '../utils/page-geometry'
import { openPdf } from './pdf-render'

const imageSizes = new Map<string, Promise<Size>>()

/** Kích thước điểm ảnh gốc của một tệp ảnh (đã quy EXIF lúc nạp). */
export function imagePixelSize(source: ImageSource): Promise<Size> {
  let size = imageSizes.get(source.id)
  if (!size) {
    size = createImageBitmap(new Blob([source.bytes], { type: source.mime })).then((bitmap) => {
      const value = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return value
    })
    size.catch(() => imageSizes.delete(source.id))
    imageSizes.set(source.id, size)
  }
  return size
}

/** Ảnh trên một trang ảnh / trang gộp, theo thứ tự ô, kèm xoay riêng của từng ảnh. */
export function sheetParts(source: SheetSource): CollagePart[] {
  return source.kind === 'image' ? [{ source, rotation: 0 }] : source.parts
}

/** Tờ giấy + chỗ đặt từng ảnh của một trang ảnh. */
export async function sheetLayoutOf(source: SheetSource, sheet: ImageSheet | undefined): Promise<SheetLayout> {
  const sizes = await Promise.all(sheetParts(source).map(async (part) => rotatedSize(await imagePixelSize(part.source), part.rotation)))
  return layoutSheet(sizes, sheet)
}

/**
 * Khổ trang (pt) TRƯỚC khi áp xoay thêm của người dùng: PDF = CropBox đã áp
 * `/Rotate` gốc; ảnh = tờ giấy như lúc xuất. Lớp phủ số trang/watermark đặt theo
 * khổ này — lấy khổ ảnh gốc thì số trang trên màn hình lệch hẳn so với tệp ra.
 */
export async function basePageSize(source: SourceFile, page: Pick<PageRef, 'pageIndex' | 'sheet'>): Promise<Size> {
  if (source.kind !== 'pdf') return (await sheetLayoutOf(source, page.sheet)).size
  const doc = await openPdf(source)
  const viewport = (await doc.getPage(page.pageIndex + 1)).getViewport({ scale: 1 })
  return { width: viewport.width, height: viewport.height }
}

export function clearPageSizes(): void {
  imageSizes.clear()
}
