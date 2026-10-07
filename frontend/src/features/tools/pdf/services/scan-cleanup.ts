import { degrees, PDFDocument } from 'pdf-lib'
import { newId } from '@/utils/id'
import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { originOf, type ImageSource, type PageRef, type PdfSource, type SourceFile } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { normalizeRotation } from '../utils/page-geometry'
import { describeOrigin } from '../utils/page-label'
import { analyzeScan, paperBounds, toGray, type GrayImage } from '../utils/scan-analysis'
import type { PageScan, ScanFix } from '../utils/scan-plan'
import { cropPage } from './page-edit'
import { basePageSize, sheetLayoutOf } from './page-size'
import { renderPdfPage } from './pdf-render'
import { renderImagePage } from './pdf-to-image'
import { loadPageText } from './text-layer'

/** ~100 DPI: đủ thấy nét chữ 10 pt để đo nghiêng, đủ nhẹ để soi vài trăm trang. */
const ANALYSIS_PX_PER_PT = 100 / 72
/** Ảnh gốc thu về cỡ này (cạnh dài, px) trước khi soi. */
const ANALYSIS_IMAGE_SIDE = 1200

function grayOf(canvas: HTMLCanvasElement): GrayImage {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error(translate('pdf:errors.noCanvas'))
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const gray = toGray(data, canvas.width, canvas.height)
  canvas.width = 0
  return gray
}

/** Ảnh xám của nội dung trang ở khung gốc. Trang ảnh soi ẢNH, không soi tờ giấy — lề trắng của tờ giấy không phải giấy trong ảnh. */
async function contentGray(source: PdfSource | ImageSource, page: PageRef): Promise<GrayImage> {
  if (source.kind === 'pdf') return grayOf(await renderPdfPage(source, page.pageIndex, { scale: ANALYSIS_PX_PER_PT, extraRotation: 0 }))
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  const scale = Math.min(1, ANALYSIS_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  bitmap.close()
  return grayOf(await renderImagePage(source, 0, scale))
}

export async function scanPage(source: SourceFile, page: PageRef): Promise<PageScan | null> {
  if (source.kind === 'collage') return null
  const hasText = (await loadPageText(source, page)).runs.length > 0
  const findings = analyzeScan(await contentGray(source, page), { hasText })
  return { ...findings, canDeskew: !hasText && !page.markups?.length, canCrop: !hasText }
}

/** Vùng giấy (tỉ lệ theo nội dung) → vùng cắt (pt, khung gốc) cho `cropPage`. */
async function paperArea(source: PdfSource | ImageSource, page: PageRef, paper: Rect): Promise<Rect> {
  const frame =
    source.kind === 'pdf' ? { x: 0, y: 0, ...(await basePageSize(source, page)) } : (await sheetLayoutOf(source, page.sheet)).slots[0]
  return { x: frame.x + paper.x * frame.width, y: frame.y + paper.y * frame.height, width: paper.width * frame.width, height: paper.height * frame.height }
}

function deskewedLabel(source: SourceFile, pageIndex: number): string {
  const origin = describeOrigin(source, pageIndex)
  const suffix = translate('pdf:origin.deskewed')
  return origin.endsWith(suffix) ? origin : `${origin}${suffix}`
}

/**
 * Trang PDF xoay lại bằng cách nhúng nguyên trang (Form XObject) vào trang
 * mới cùng khổ — giữ nét gốc, không vẽ lại thành ảnh. `/Rotate` của tệp được
 * gộp vào phép xoay vì trang mới không mang `/Rotate`.
 */
async function deskewPdf(source: PdfSource, page: PageRef, skew: number): Promise<PdfSource> {
  const doc = await PDFDocument.load(source.bytes, { updateMetadata: false })
  const original = doc.getPage(page.pageIndex)
  const crop = original.getCropBox()
  const turn = normalizeRotation(original.getRotation().angle)
  const sideways = turn === 90 || turn === 270
  const width = sideways ? crop.height : crop.width
  const height = sideways ? crop.width : crop.height

  const output = await PDFDocument.create()
  const embedded = await output.embedPage(original, { left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height })
  const target = output.addPage([width, height])
  // pdf-lib xoay ngược chiều kim đồng hồ quanh góc dưới-trái → bù để xoay quanh tâm trang.
  const angle = skew - turn
  const radians = (angle * Math.PI) / 180
  const cx = crop.width / 2
  const cy = crop.height / 2
  target.drawPage(embedded, {
    x: width / 2 - (cx * Math.cos(radians) - cy * Math.sin(radians)),
    y: height / 2 - (cx * Math.sin(radians) + cy * Math.cos(radians)),
    rotate: degrees(angle),
  })
  const bytes = await output.save()
  return {
    id: newId(),
    originId: originOf(source),
    name: source.name,
    label: deskewedLabel(source, page.pageIndex),
    kind: 'pdf',
    mime: 'application/pdf',
    bytes: bytes as Uint8Array<ArrayBuffer>,
    size: bytes.byteLength,
    pageCount: 1,
  }
}

/** Ảnh xoay lại cùng khổ, góc hở tô trắng như giấy. */
async function deskewImage(source: ImageSource, page: PageRef, skew: number): Promise<ImageSource> {
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.mime }))
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  try {
    const context = canvas.getContext('2d')
    if (!context) throw new Error(translate('pdf:errors.noCanvas'))
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.translate(canvas.width / 2, canvas.height / 2)
    // Canvas y hướng xuống: góc dương xoay xuôi kim đồng hồ — nghiêng xuôi thì xoay ngược lại.
    context.rotate((-skew * Math.PI) / 180)
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  } finally {
    bitmap.close()
  }
  const blob = await canvasToBlob(canvas, source.mime).catch(() => null)
  canvas.width = 0
  if (!blob) throw new ToolError(TOOL_ERROR.exportFailed, translate('pdf:errors.deskew'))
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return {
    id: newId(),
    originId: originOf(source),
    name: source.name,
    label: deskewedLabel(source, page.pageIndex),
    kind: 'image',
    mime: source.mime,
    bytes,
    size: bytes.byteLength,
    pageCount: 1,
  }
}

/**
 * Chỉnh nghiêng rồi cắt viền một trang; trang giữ id. Chỉnh nghiêng xong phải
 * soi lại vùng giấy: tờ giấy đã thẳng, khung cắt cũ (đo trên ảnh nghiêng) lẹm
 * mất góc giấy hoặc để sót viền tối.
 */
export async function fixScanPage(source: SourceFile, page: PageRef, fix: ScanFix): Promise<{ sources: SourceFile[]; page: PageRef } | null> {
  if (source.kind === 'collage') return null
  let current: PdfSource | ImageSource = source
  let ref = page
  const sources: SourceFile[] = []
  if (fix.skew !== null) {
    current = source.kind === 'pdf' ? await deskewPdf(source, page, fix.skew) : await deskewImage(source, page, fix.skew)
    // Trang PDF mới đã gộp `/Rotate` vào nội dung; xoay thêm của người dùng giữ nguyên.
    ref = { ...page, sourceId: current.id, pageIndex: 0 }
    sources.push(current)
  }
  if (fix.crop) {
    const paper = paperBounds(await contentGray(current, ref))
    const cropped = paper ? await cropPage(current, ref, await paperArea(current, ref, paper)) : null
    if (cropped) {
      sources.push(cropped.source)
      ref = cropped.page
    }
  }
  return sources.length ? { sources, page: ref } : null
}
