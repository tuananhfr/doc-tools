import { PDFDocument } from 'pdf-lib'
import { newId } from '@/utils/id'
import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob } from '@/features/tools/shared'
import { originOf, type CollagePart, type CollageSource, type ImageSource, type PageRef, type PdfSource, type SourceFile } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { moveMarkup } from '../utils/markup-geometry'
import { fitTransform, transformMarkup } from '../utils/markup-transform'
import { normalizeRotation, visualToUser } from '../utils/page-geometry'
import { describeOrigin } from '../utils/page-label'
import { basePageSize, imagePixelSize, sheetLayoutOf } from './page-size'
import { finishCarryover, prepareSource } from './pdf-carryover'
import { formSummary } from './pdf-form'

/** Vùng cắt nhỏ hơn thế này gần như chắc là bấm nhầm, không phải ý định cắt. */
export const MIN_CROP = 12

const CUT_SUFFIX = ' · đã cắt'

function croppedLabel(source: SourceFile, pageIndex: number): string {
  const origin = describeOrigin(source, pageIndex)
  return origin.endsWith(CUT_SUFFIX) ? origin : `${origin}${CUT_SUFFIX}`
}

export function makeCollage(parts: CollagePart[]): CollageSource {
  const label = `Gộp ${parts.length} ảnh`
  return {
    id: newId(),
    originId: parts.length ? originOf(parts[0].source) : undefined,
    name: label,
    label,
    kind: 'collage',
    parts,
    size: parts.reduce((sum, part) => sum + part.source.size, 0),
    pageCount: 1,
  }
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return right - x >= MIN_CROP && bottom - y >= MIN_CROP ? { x, y, width: right - x, height: bottom - y } : null
}

/**
 * Trang PDF cắt ra thành một tệp một trang mới: CropBox thu lại, nội dung
 * không đổi — chữ bên ngoài vùng cắt vẫn nằm trong tệp (như mọi trình cắt
 * trang PDF), chỉ không hiện. Làm thành nguồn riêng để lớp chữ, xem trước và
 * xuất tệp chạy y như trang thường, không phải trang nào cũng mang theo độ lệch.
 */
async function cropPdf(source: PdfSource, page: PageRef, area: Rect) {
  const doc = await PDFDocument.load(source.bytes, { updateMetadata: false })
  const output = await PDFDocument.create()
  // Trang cắt vẫn giữ form, layer, tệp đính kèm của tệp gốc; liên kết sang trang khác thì mất (tệp chỉ còn một trang).
  const prepared = prepareSource(doc, source.id, [page.pageIndex])
  const [copied] = await output.copyPages(doc, [page.pageIndex])
  output.addPage(copied)
  finishCarryover(output, [prepared], [{ page: copied, sourceKey: source.id, pageIndex: page.pageIndex }])
  const box = copied.getCropBox()
  const rotation = normalizeRotation(copied.getRotation().angle)
  const a = visualToUser({ x: area.x, y: area.y }, box, rotation)
  const b = visualToUser({ x: area.x + area.width, y: area.y + area.height }, box, rotation)
  copied.setCropBox(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
  const bytes = await output.save()

  const cropped: PdfSource = {
    id: newId(),
    originId: originOf(source),
    name: source.name,
    label: croppedLabel(source, page.pageIndex),
    kind: 'pdf',
    mime: 'application/pdf',
    bytes: bytes as Uint8Array<ArrayBuffer>,
    size: bytes.byteLength,
    pageCount: 1,
    form: formSummary(output),
  }
  const markups = page.markups?.map((markup) => moveMarkup(markup, -area.x, -area.y))
  return { source: cropped, page: { ...page, sourceId: cropped.id, pageIndex: 0, markups } }
}

/** Ảnh cắt ra thành ảnh mới cùng định dạng; dấu đi theo phần ảnh còn lại trên tờ giấy mới. */
async function cropImage(source: ImageSource, page: PageRef, area: Rect) {
  const layout = await sheetLayoutOf(source, page.sheet)
  const slot = layout.slots[0]
  const kept = intersect(area, slot)
  if (!kept) return null

  const pixels = await imagePixelSize(source)
  const ratio = pixels.width / slot.width
  const sx = Math.round((kept.x - slot.x) * ratio)
  const sy = Math.round((kept.y - slot.y) * ratio)
  const width = Math.max(1, Math.round(kept.width * ratio))
  const height = Math.max(1, Math.round(kept.height * ratio))

  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  try {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không cấp được canvas.')
    context.drawImage(bitmap, sx, sy, width, height, 0, 0, width, height)
  } finally {
    bitmap.close()
  }
  const blob = await canvasToBlob(canvas, source.mime).catch(() => null)
  if (!blob) throw new ToolError(TOOL_ERROR.exportFailed, 'Không cắt được ảnh.')
  const bytes = new Uint8Array(await blob.arrayBuffer())

  const cropped: ImageSource = {
    id: newId(),
    originId: originOf(source),
    name: source.name,
    label: croppedLabel(source, page.pageIndex),
    kind: 'image',
    mime: source.mime,
    bytes,
    size: bytes.byteLength,
    pageCount: 1,
  }
  const next = await sheetLayoutOf(cropped, page.sheet)
  const t = fitTransform(kept, next.slots[0])
  const markups = page.markups?.map((markup) => transformMarkup(markup, t))
  return { source: cropped, page: { ...page, sourceId: cropped.id, pageIndex: 0, markups } }
}

/**
 * Cắt trang theo `area` (pt, khung gốc). Trả `null` khi vùng cắt quá nhỏ hoặc
 * nằm ngoài nội dung. Trang giữ nguyên id — đang chọn / đang xem vẫn trỏ đúng.
 */
export async function cropPage(source: SourceFile, page: PageRef, area: Rect): Promise<{ source: SourceFile; page: PageRef } | null> {
  if (source.kind === 'collage') return null
  const base = await basePageSize(source, page)
  const clamped = intersect(area, { x: 0, y: 0, width: base.width, height: base.height })
  if (!clamped) return null
  return source.kind === 'pdf' ? cropPdf(source, page, clamped) : cropImage(source, page, clamped)
}
