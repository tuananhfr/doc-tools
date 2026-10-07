import type { FlowNote, FlowTask } from '@/features/tools/hub'
import { stem } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import type { ImageItem, Rect, Size } from '../types/image.types'
import type { MarkState } from '../types/mark.types'
import type { MeasureState } from '../types/measure.types'
import type { CropState } from '../utils/crop-state'
import { IMAGE_FORMAT, outputName, sizeLabel } from '../utils/image-format'
import { scaleOf, summarize } from '../utils/measure'
import { LOW_DPI, printDpi, type SheetLayout } from '../utils/photo-layout'
import { renderCrop } from './crop-render'
import { writableFormat } from './image-codec'
import { carryExif, exifNotes, type ExifOutcome } from './image-exif'
import { renderMarked } from './mark-render'
import { renderMeasured, type MeasureColors } from './measure-render'
import { renderSheetImage, renderSheetPdf, renderSinglePhoto } from './photo-sheet'

/** Việc làm trên MỘT ảnh đang mở trong vùng làm việc: cắt / chỉnh, ghi số đo, che + đóng dấu, ảnh thẻ. */

function formatNotes(item: ImageItem, exif: ExifOutcome): FlowNote[] {
  const format = writableFormat(item.format)
  const notes: FlowNote[] = []
  if (format !== item.format) notes.push({ tone: 'info', text: translate('image:tasks.formatFallback', { from: IMAGE_FORMAT[item.format].label, to: IMAGE_FORMAT[format].label }) })
  return [...notes, ...exifNotes([exif])]
}

/** Cắt, xoay, chỉnh sáng / tương phản; giữ định dạng của ảnh gốc. */
export function cropTask(item: ImageItem, state: CropState): FlowTask {
  return async (step) => {
    step.onProgress(0, 1, translate('image:tasks.rendering'))
    const format = writableFormat(item.format)
    const { blob: drawn, size } = await renderCrop(item.file, state, format)
    const { blob, exif } = await carryExif(item, drawn, format, size)
    step.signal.throwIfAborted()
    return {
      title: translate('image:crop.title'),
      output: { name: outputName(item.name, format, translate('image:file.adjusted')), blob, detail: sizeLabel(size) },
      notes: formatNotes(item, exif),
    }
  }
}

function measuredSummary({ distances, areas, counts }: ReturnType<typeof summarize>): string {
  const parts: string[] = []
  if (distances) parts.push(translate('image:measure.summaryDistances', { count: distances }))
  if (areas) parts.push(translate('image:measure.summaryAreas', { count: areas }))
  if (counts) parts.push(translate('image:measure.summaryCounts', { count: counts }))
  return parts.join(', ')
}

/** Vẽ các số đo lên ảnh gốc ở độ phân giải gốc. */
export function measureTask(item: ImageItem, state: MeasureState, colors: MeasureColors): FlowTask {
  return async (step) => {
    step.onProgress(0, 1, translate('image:tasks.rendering'))
    const format = writableFormat(item.format)
    const { blob: drawn, size } = await renderMeasured(item.file, state.shapes, state.reference, colors, format)
    const { blob, exif } = await carryExif(item, drawn, format, size)
    step.signal.throwIfAborted()

    const summary = summarize(state.shapes)
    const notes: FlowNote[] = [{ tone: 'success', text: translate('image:measure.recorded', { summary: measuredSummary(summary) }) }]
    // Số đo theo điểm ảnh không so được với thực tế — nói ra để người nhận ảnh không đọc nhầm.
    if (!scaleOf(state.reference) && summary.distances + summary.areas > 0) {
      notes.push({ tone: 'warning', text: translate('image:measure.pixelWarning') })
    }
    return {
      title: translate('image:measure.title'),
      output: { name: outputName(item.name, format, translate('image:file.measured')), blob, detail: sizeLabel(size) },
      notes: [...notes, ...formatNotes(item, exif)],
    }
  }
}

/** Ghi khung che và dấu chữ thẳng vào điểm ảnh; giữ định dạng của ảnh gốc. */
export function markTask(item: ImageItem, state: MarkState): FlowTask {
  return async (step) => {
    step.onProgress(0, 1, translate('image:tasks.rendering'))
    const format = writableFormat(item.format)
    const { blob: drawn, size } = await renderMarked(item.file, state, format)
    const { blob, exif } = await carryExif(item, drawn, format, size)
    step.signal.throwIfAborted()

    const stamped = state.stamp.text.trim() !== ''
    const notes: FlowNote[] = []
    if (state.boxes.length > 0) {
      notes.push({ tone: 'success', text: translate('image:mark.boxesNote', { count: state.boxes.length }) })
    }
    if (stamped) notes.push({ tone: 'success', text: translate('image:mark.stampNote') })
    return {
      title: state.boxes.length > 0 ? (stamped ? translate('image:mark.titleBoth') : translate('image:mark.titleBoxes')) : translate('image:mark.titleStamp'),
      output: { name: outputName(item.name, format, translate(state.boxes.length > 0 ? 'image:file.redacted' : 'image:file.stamped')), blob, detail: sizeLabel(size) },
      notes: [...notes, ...formatNotes(item, exif)],
    }
  }
}

export type PhotoOutput = 'pdf' | 'sheet' | 'single'

export interface IdPhotoOptions {
  output: PhotoOutput
  /** Cỡ ảnh thẻ (mm). */
  photo: Size & { id: string; label: string }
  layout: SheetLayout
  /** Vẽ viền cắt quanh từng ảnh trên tờ in. */
  guides: boolean
  /** "A4", "Giấy ảnh 10 × 15 cm". */
  paperLabel: string
}

/** Ảnh thẻ: tờ in nhiều bản (PDF hoặc JPG 300 DPI), hoặc một ảnh đã cắt đúng cỡ. */
export function idPhotoTask(item: ImageItem, rect: Rect, { output, photo, layout, guides, paperLabel }: IdPhotoOptions): FlowTask {
  return async (step) => {
    step.onProgress(0, 1, output === 'single' ? translate('image:tasks.rendering') : translate('image:idPhoto.renderingSheet'))
    const base = `${stem(item.name) || translate('image:file.fallback')} - ${translate('image:file.idPhoto', { size: photo.id })}`
    const notes: FlowNote[] = []
    const dpi = printDpi(rect.width, photo.width)
    if (dpi < LOW_DPI) notes.push({ tone: 'warning', text: translate('image:idPhoto.lowDpiNote', { dpi, size: photo.label }) })

    if (output === 'single') {
      const { blob: drawn, size } = await renderSinglePhoto(item.file, rect, photo)
      const { blob, exif } = await carryExif(item, drawn, 'jpeg', size)
      step.signal.throwIfAborted()
      return {
        title: translate('image:idPhoto.titleSingle'),
        output: { name: `${base}.jpg`, blob, detail: `${photo.label} · ${sizeLabel(size)}` },
        notes: [...notes, ...exifNotes([exif])],
      }
    }

    const count = layout.cells.length
    const detail = translate('image:idPhoto.sheetDetail', { count, photo: photo.label, paper: paperLabel })
    // Tờ in là một bố cục mới chứ không phải ảnh gốc vẽ lại — nói rõ nó không mang EXIF.
    notes.push({ tone: 'info', text: translate('image:idPhoto.noExif') })
    notes.push({ tone: 'info', text: translate('image:idPhoto.actualSize') })

    if (output === 'pdf') {
      const blob = await renderSheetPdf(item.file, rect, layout, guides, base)
      step.signal.throwIfAborted()
      return { title: translate('image:idPhoto.titleSheet'), output: { name: `${base} - ${translate('image:file.imageCount', { count })}.pdf`, blob, detail }, notes }
    }
    const { blob, size } = await renderSheetImage(item.file, rect, layout, guides)
    step.signal.throwIfAborted()
    return { title: translate('image:idPhoto.titleSheet'), output: { name: `${base} - ${translate('image:file.imageCount', { count })}.jpg`, blob, detail: `${detail} · ${sizeLabel(size)}` }, notes }
  }
}
