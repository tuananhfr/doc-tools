import type { FlowNote, FlowOutput } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import { carryExif, createCanvas, decodeImage, encodeCanvas, exifNotes, outputName, releaseCanvas, sizeLabel, writableFormat } from '@/features/tools/image'
import type { Size } from '../types/orientation.types'
import type { OrientationSourceFile } from '../types/source.types'
import { compassShapes, scaleShapes, type CompassShape } from '../utils/compass-geometry'
import type { CompassPalette } from '../utils/compass-palette'
import { overlayCompass, standaloneCompass, type CompassExtras } from '../utils/compass-view'
import type { OrientationState } from '../utils/orientation-state'
import { sceneShapes } from '../utils/scene-geometry'
import { drawShapes, drawLegend } from './compass-draw'

export type ExportFormat = 'image' | 'pdf'

export interface ExportRequest {
  state: OrientationState
  source: OrientationSourceFile
  palette: CompassPalette
  legend: string[]
  format: ExportFormat
  /** Nhãn cạnh mũi tên của từng đối tượng (id → nhãn). */
  labelOf: (id: string) => string
  extras: CompassExtras
}

/** Lớp vẽ đè lên ảnh: nét vẽ tay + trục (đậm) và la bàn (độ mờ người dùng chọn). */
interface OverlayLayers {
  scene: CompassShape[]
  compass: CompassShape[]
  opacity: number
}

export interface ExportResult {
  output: FlowOutput
  notes: FlowNote[]
}

/** Cạnh dài của ảnh xuất khi nguồn là PDF (trang vẽ lại) — đủ in A4 ở ~200 dpi. */
const PDF_RASTER_SIDE = 2400
/** Khung la bàn đứng riêng. */
const CARD_SIDE = 1200
/** Ảnh nguồn xuất ra PDF: cạnh dài = cạnh dài A4 (điểm PDF). */
const A4_LONG = 842

const unitOf = (size: Size) => Math.max(size.width, size.height) / 900

function scaleLayers(layers: OverlayLayers, factor: number): OverlayLayers {
  return { ...layers, scene: scaleShapes(layers.scene, factor), compass: scaleShapes(layers.compass, factor) }
}

function paintLayers(context: CanvasRenderingContext2D, layers: OverlayLayers, palette: CompassPalette) {
  drawShapes(context, layers.scene, palette, 1)
  drawShapes(context, layers.compass, palette, layers.opacity)
}

// `save()` trả Uint8Array có thể trỏ vào SharedArrayBuffer — Blob chỉ nhận bản trên ArrayBuffer thường.
const pdfBlob = (bytes: Uint8Array) => new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })

const stem = (name: string) => name.replace(/\.[^.]+$/, '')

async function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return encodeCanvas(canvas, 'png')
}

/** Lớp phủ trong suốt (la bàn + chú thích) đúng cỡ `size` — để đặt lên trang PDF vector. */
async function overlayLayer(layers: OverlayLayers, size: Size, request: ExportRequest): Promise<Blob> {
  const { canvas, context } = createCanvas(size)
  try {
    paintLayers(context, layers, request.palette)
    drawLegend(context, request.legend, size, unitOf(size), request.palette)
    return await canvasPng(canvas)
  } finally {
    releaseCanvas(canvas)
  }
}

/** Ảnh nguồn + la bàn + chú thích, ở độ phân giải gốc của ảnh. */
async function compositeImage(background: Blob, layers: OverlayLayers, request: ExportRequest, format: 'jpeg' | 'png' | 'webp'): Promise<{ blob: Blob; size: Size }> {
  const bitmap = await decodeImage(background)
  try {
    const size = { width: bitmap.width, height: bitmap.height }
    const { canvas, context } = createCanvas(size)
    try {
      if (format === 'jpeg') {
        context.fillStyle = request.palette.disc
        context.fillRect(0, 0, size.width, size.height)
      }
      context.drawImage(bitmap, 0, 0)
      paintLayers(context, layers, request.palette)
      drawLegend(context, request.legend, size, unitOf(size), request.palette)
      return { blob: await encodeCanvas(canvas, format), size }
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}

/** La bàn đứng riêng (không ảnh, hoặc chưa đặt được lên ảnh). */
async function compassCard(request: ExportRequest): Promise<{ blob: Blob; size: Size }> {
  const unit = CARD_SIDE / 900
  // Chừa đáy cho chú thích: mỗi dòng ~20 đơn vị.
  const size = { width: CARD_SIDE, height: CARD_SIDE + Math.round((request.legend.length * 20 + 24) * unit) }
  const { canvas, context } = createCanvas(size)
  try {
    context.fillStyle = request.palette.disc
    context.fillRect(0, 0, size.width, size.height)
    drawShapes(context, compassShapes(standaloneCompass(request.state, CARD_SIDE, request.extras)), request.palette, 1)
    drawLegend(context, request.legend, size, unit, request.palette)
    return { blob: await canvasPng(canvas), size }
  } finally {
    releaseCanvas(canvas)
  }
}

/** Một trang PDF chứa nguyên một ảnh, cạnh dài bằng cạnh dài A4. */
async function imagePdf(blob: Blob, size: Size): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const image = blob.type === 'image/jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
  const factor = A4_LONG / Math.max(size.width, size.height)
  const page = doc.addPage([size.width * factor, size.height * factor])
  page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })
  return pdfBlob(await doc.save())
}

/**
 * Trang PDF gốc GIỮ NGUYÊN dạng vector (chữ vẫn chọn được, nét vẫn sắc), la bàn
 * là một lớp ảnh trong suốt phủ lên trên. Trang có /Rotate thì đặt trang gốc
 * xoay sẵn vào trang mới đứng thẳng — lớp phủ được vẽ theo đúng cái người dùng
 * nhìn thấy (pdf.js đã xoay), nên không xoay thì la bàn lệch 90°.
 */
async function vectorPdf(source: Extract<OrientationSourceFile, { kind: 'pdf' }>, overlay: Blob): Promise<Blob> {
  const { PDFDocument, degrees } = await import('pdf-lib')
  const original = await PDFDocument.load(source.bytes)
  const page = original.getPage(source.pageIndex)
  const crop = page.getCropBox()
  const rotation = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270

  const doc = await PDFDocument.create()
  const embedded = await doc.embedPage(page, { left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height })
  const { width: w, height: h } = embedded
  const turned = rotation === 90 || rotation === 270
  const sheet = doc.addPage(turned ? [h, w] : [w, h])
  // Xoay theo chiều kim đồng hồ quanh góc dưới-trái rồi dời về lại trong trang.
  const place = { 0: { x: 0, y: 0 }, 90: { x: 0, y: w }, 180: { x: w, y: h }, 270: { x: h, y: 0 } }[rotation]
  sheet.drawPage(embedded, { ...place, rotate: degrees(-rotation) })
  const layer = await doc.embedPng(new Uint8Array(await overlay.arrayBuffer()))
  sheet.drawImage(layer, { x: 0, y: 0, width: sheet.getWidth(), height: sheet.getHeight() })
  return pdfBlob(await doc.save())
}

/** Dựng tệp kết quả: ảnh / PDF mới, KHÔNG sửa tệp gốc (spec v1.1 §12). */
export async function exportOrientation(request: ExportRequest): Promise<ExportResult> {
  const { source, state, format } = request
  const notes: FlowNote[] = []
  const view = source.kind === 'none' ? null : source.view
  const spec = view ? overlayCompass(state, view, request.extras) : null

  if (!view || !spec) {
    const card = await compassCard(request)
    if (view) notes.push({ tone: 'info', text: translate('orientation:export.notes.standalone') })
    const blob = format === 'pdf' ? await imagePdf(card.blob, card.size) : card.blob
    return { output: { name: `${translate('orientation:file.compass')}.${format === 'pdf' ? 'pdf' : 'png'}`, blob, detail: sizeLabel(card.size) }, notes }
  }

  const onImage: OverlayLayers = { scene: sceneShapes(state, view, request.labelOf), compass: compassShapes(spec), opacity: state.compass?.opacity ?? 1 }

  if (source.kind === 'image') {
    const imageFormat = writableFormat(source.item.format)
    const drawn = await compositeImage(source.item.file, onImage, request, imageFormat)
    if (format === 'pdf') {
      const blob = await imagePdf(drawn.blob, drawn.size)
      return { output: { name: `${stem(source.item.name)} - ${translate('orientation:file.suffix')}.pdf`, blob, detail: sizeLabel(drawn.size) }, notes }
    }
    // Giữ EXIF của ảnh gốc — quyết định 03/10/2026, kể cả toạ độ GPS (lệch spec v1.1 §17 có chủ đích).
    const { blob, exif } = await carryExif(source.item, drawn.blob, imageFormat, drawn.size)
    return { output: { name: outputName(source.item.name, imageFormat, translate('orientation:file.suffix')), blob, detail: sizeLabel(drawn.size) }, notes: [...notes, ...exifNotes([exif])] }
  }

  if (source.kind === 'pdf') {
    if (format === 'pdf') {
      const factor = PDF_RASTER_SIDE / Math.max(view.width, view.height)
      const size = { width: Math.round(view.width * factor), height: Math.round(view.height * factor) }
      const overlay = await overlayLayer(scaleLayers(onImage, factor), size, request)
      try {
        const blob = await vectorPdf(source, overlay)
        return { output: { name: `${stem(source.name)} - ${translate('orientation:file.suffix')}.pdf`, blob, detail: translate('orientation:export.pageDetail', { page: source.pageIndex + 1 }) }, notes }
      } catch {
        // PDF có mã hoá quyền / cấu trúc lạ mà pdf-lib không mở được: vẫn trả về bản vẽ lại thay vì báo lỗi.
        notes.push({ tone: 'warning', text: translate('orientation:export.notes.rasterized') })
      }
    }
    const { renderPdfPage } = await import('./pdf-page')
    const page = await renderPdfPage(source.bytes, source.pageIndex, PDF_RASTER_SIDE)
    const drawn = await compositeImage(page.blob, scaleLayers(onImage, page.width / view.width), request, 'png')
    const blob = format === 'pdf' ? await imagePdf(drawn.blob, drawn.size) : drawn.blob
    return {
      output: { name: `${stem(source.name)} - ${translate('orientation:file.page', { page: source.pageIndex + 1 })} - ${translate('orientation:file.suffix')}.${format === 'pdf' ? 'pdf' : 'png'}`, blob, detail: sizeLabel(drawn.size) },
      notes,
    }
  }

  throw new Error(translate('orientation:export.noSource'))
}
