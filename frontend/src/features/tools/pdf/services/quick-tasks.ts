import type { FlowNote, FlowResult, FlowStep, FlowTask } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import type { QuickItem } from '../hooks/useQuickSources'
import { DEFAULT_PDF_OUTPUT, type ImageFormat, type ImageSheet, type PageRef, type PdfOutput, type SourceFile } from '../types/doc-tools.types'
import { groupByOrigin } from '../utils/batch-groups'
import { CANVAS_CAP } from '../utils/canvas-cap'
import { carryoverSummary, type CarryoverReport } from '../utils/carryover-summary'
import { formatBytes, sizeChange, type Compression, type CompressionStats } from '../utils/compression'
import { baseName } from '../utils/file-guard'
import { isDefaultSheet } from '../utils/image-sheet'
import { joinPageTexts, plainText } from '../utils/plain-text'
import { rangeLabel } from '../utils/split-groups'
import { buildBatch, buildImages, buildOffice, buildPdf, buildSplit, type BuildContext, type BuiltFile, type OfficeKind } from './doc-build'
import { recognizePage, stopOcr } from './ocr'
import { ocrText, saveOcrText, removeOcrText } from './ocr-store'
import { recognizePipeline, ocrFingerprint } from './ocr-pipeline'
import { ocrSourceHash } from './ocr-quality'
import { DEFAULT_OCR_OPTIONS, type OcrPipelineOptions } from '../types/ocr-profile.types'
import { exportReviewedOcr, reviewedOcrText, type OcrStructuredOutput } from './ocr-export'
import { loadPageText } from './text-layer'

/**
 * Việc của các công cụ nhanh "Chuyện Nhỏ" làm trên CẢ TỆP (việc trên từng
 * trang — sắp xếp, đánh số, đóng dấu, che — ở `page-tasks`). Mỗi hàm nhận tệp + tuỳ chọn và
 * trả về một `FlowTask`: dựng tệp bằng đúng engine của trình chỉnh sửa
 * (`doc-build`), rồi nói ra bằng lời những gì người dùng cần biết về tệp vừa ra.
 */

export type ConvertTarget = OfficeKind | ImageFormat
export type OcrOutput = 'pdf' | 'text' | OcrStructuredOutput
export type OcrReviewStep = (items: QuickItem[], signal: AbortSignal) => Promise<void>

export function contextOf(items: QuickItem[]): BuildContext {
  return { sources: Object.fromEntries(items.map((item) => [item.source.id, item.source])) }
}

export function pagesOf(items: QuickItem[]): PageRef[] {
  return items.flatMap((item) => item.pages)
}

export function firstName(items: QuickItem[]): string {
  return baseName(items[0].source.name)
}

export function output(file: BuiltFile, detail?: string) {
  return { name: file.name, blob: file.blob, detail }
}

export function carryoverNotes(report: CarryoverReport): FlowNote[] {
  const summary = carryoverSummary(report)
  return summary ? [summary] : []
}

// Không nói ra thì bản vẽ A0 "300 DPI" thực ra ~100 DPI mà người đem in không hề biết.
function reducedNotes(reduced: number[], dpi: number): FlowNote[] {
  if (reduced.length === 0) return []
  const lowest = Math.round(Math.min(...reduced))
  const vars = { lowest, dpi, megapixels: CANVAS_CAP.maxArea / 1_000_000 }
  return [
    {
      tone: 'warning',
      text: reduced.length === 1 ? translate('pdf:exportToast.reducedOne', vars) : translate('pdf:exportToast.reducedMany', { ...vars, count: reduced.length }),
    },
  ]
}

function withoutTextNotes(count: number, target: ConvertTarget, recognized: boolean): FlowNote[] {
  if (count === 0 || (target !== 'word' && target !== 'excel')) return []
  if (recognized) return [{ tone: 'warning', text: translate(`pdf:quickTask.${target}Recognized`, { count }) }]
  return [{ tone: 'warning', text: translate(`pdf:quickTask.${target}NoText`, { count }) }]
}

/** Ghép mọi tệp theo thứ tự đang xếp thành một PDF. */
export function mergeTask(items: QuickItem[]): FlowTask {
  return async (step) => {
    const pages = pagesOf(items)
    const built = await buildPdf(contextOf(items), pages, `${firstName(items)} - ${translate('pdf:file.merged')}`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: translate('pdf:quickTask.mergeDone', { count: items.length }),
      output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })),
      notes: carryoverNotes(built.carryover),
    }
  }
}

/** Tách một PDF: mỗi nhóm trang (chỉ số đếm từ 0) thành một tệp. */
export function splitTask(item: QuickItem, groups: number[][]): FlowTask {
  return async (step) => {
    const context = contextOf([item])
    const name = baseName(item.source.name)
    const parts = groups.map((group) => ({ label: rangeLabel(group), pages: group.map((index) => item.pages[index]) }))
    // Một nhóm thì trả thẳng tệp PDF — gói .zip một tệp chỉ bắt người dùng giải nén thừa.
    if (parts.length === 1) {
      const [part] = parts
      const built = await buildPdf(context, part.pages, `${name} - trang ${part.label}`, DEFAULT_PDF_OUTPUT, step)
      return {
        title: translate('pdf:quickTask.splitOne', { count: part.pages.length }),
        output: output(built.file, translate('pdf:stage.pageCount', { count: part.pages.length })),
        notes: carryoverNotes(built.carryover),
      }
    }
    const built = await buildSplit(context, parts, name, DEFAULT_PDF_OUTPUT, step)
    return {
      title: translate('pdf:quickTask.splitMany', { count: parts.length }),
      output: output(built.file, translate('pdf:quickTask.pdfFiles', { count: parts.length })),
      notes: carryoverNotes(built.carryover),
    }
  }
}

/**
 * So với TỆP GỐC người dùng đưa vào (không so với bản dựng lại chưa nén như
 * `compressionSummary` của trình chỉnh sửa): ở công cụ này người ta chỉ hỏi
 * một câu — tệp tải về có nhẹ hơn tệp đã chọn không.
 */
function compressionNotes(stats: CompressionStats, before: number, after: number): FlowNote[] {
  const sizes = `${formatBytes(before)} → ${formatBytes(after)}`
  const change = sizeChange(before, after)
  const notes: FlowNote[] = []
  if (after < before && change) {
    notes.push({
      tone: 'success',
      text: stats.recompressed
        ? translate('pdf:quickTask.compressSavedImages', { sizes, change, count: stats.recompressed })
        : translate('pdf:quickTask.compressSaved', { sizes, change }),
    })
  } else {
    const why = stats.recompressed === 0 ? translate('pdf:quickTask.compressNoJpeg') : translate('pdf:quickTask.compressMaxed')
    notes.push({ tone: 'warning', text: translate('pdf:quickTask.compressNotSmaller', { sizes, why }) })
  }
  if (stats.flate) notes.push({ tone: 'info', text: translate('pdf:quickTask.flateKept', { count: stats.flate }) })
  return notes
}

/** Nén ảnh JPEG trong từng tệp; nhiều tệp thì mỗi tệp một PDF, gói chung một .zip. */
export function compressTask(items: QuickItem[], level: Exclude<Compression, 'none'>): FlowTask {
  return async (step) => {
    const context = contextOf(items)
    const pdfOutput: PdfOutput = { compression: level, markupOutput: 'flat' }
    const before = items.reduce((sum, item) => sum + item.source.size, 0)
    const built =
      items.length === 1
        ? await buildPdf(context, items[0].pages, `${firstName(items)} - ${translate('pdf:file.compressed')}`, pdfOutput, step)
        : await buildBatch(context, groupByOrigin(pagesOf(items), context.sources), 'pdf', { output: pdfOutput, image: { format: 'jpeg', dpi: 150 } }, translate('pdf:file.compressedBatch'), step)
    const smaller = built.bytes < before
    return {
      title: smaller ? translate('pdf:quickTask.compressDone') : translate('pdf:quickTask.compressNone'),
      tone: smaller ? 'success' : 'warning',
      output: output(
        built.file,
        items.length === 1 ? translate('pdf:stage.pageCount', { count: items[0].pages.length }) : translate('pdf:quickTask.pdfFiles', { count: items.length }),
      ),
      notes: [...compressionNotes(built.compression, before, built.bytes), ...carryoverNotes(built.carryover)],
    }
  }
}

/**
 * PDF → Word / Excel / ảnh từng trang; nhiều tệp thì mỗi tệp một kết quả, gói chung một .zip.
 * `ocr`: nhận dạng trước các trang scan. Phần dựng Word/Excel đọc chữ qua `loadPageText`,
 * vốn trả kết quả OCR đã lưu, nên không cần biết trang nào vừa được nhận dạng.
 */
export function convertTask(items: QuickItem[], target: ConvertTarget, dpi: number, ocr = false): FlowTask {
  return async (step) => {
    const context = contextOf(items)
    const pages = pagesOf(items)
    const targetLabel = translate(`pdf:quickTask.target.${target}`)
    const title = translate('pdf:quickTask.converted', { target: targetLabel })
    const building = translate('pdf:quickTask.building', { target: targetLabel })
    const office = target === 'word' || target === 'excel'
    const found = office && ocr ? await recognizeMissing(context.sources, pages, pages.length, step) : null
    const build = found
      ? { signal: step.signal, onProgress: (done: number) => step.onProgress(found.spent + done, found.spent + pages.length, building) }
      : step
    const officeNotes = (withoutText: number) => [...(found ? ocrNotes(found) : []), ...withoutTextNotes(withoutText, target, found !== null)]

    if (items.length > 1) {
      const built = await buildBatch(
        context,
        groupByOrigin(pages, context.sources),
        office ? target : 'image',
        { output: DEFAULT_PDF_OUTPUT, image: { format: office ? 'jpeg' : target, dpi } },
        translate('pdf:file.convertedBatch', { target: targetLabel }),
        build,
      )
      return {
        title,
        output: output(built.file, translate('pdf:quickTask.files', { count: items.length })),
        notes: [...(office ? officeNotes(built.withoutText) : []), ...reducedNotes(built.reduced, dpi)],
      }
    }
    if (office) {
      const built = await buildOffice(context, target, pages, firstName(items), build)
      return { title, output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })), notes: officeNotes(built.withoutText) }
    }
    const built = await buildImages(context, pages, target, dpi, firstName(items), step)
    return {
      title,
      output: output(built.file, pages.length === 1 ? `${dpi} DPI` : translate('pdf:quickTask.imagesDpi', { count: pages.length, dpi })),
      notes: reducedNotes(built.reduced, dpi),
    }
  }
}

/** Một trang OCR nặng gấp nhiều lần chép một trang vào PDF — thanh tiến độ chia theo tỉ lệ đó. */
const OCR_WEIGHT = 10

interface Recognized {
  /** Trang vừa nhận dạng + trang đã nhận dạng ở lượt chạy trước. */
  pages: number
  words: number
  /** Trang PDF có sẵn lớp chữ — không nhận dạng lại. */
  native: number
  /** Trang nhận dạng xong mà không ra chữ nào. */
  blank: number
  /** Số đơn vị tiến độ phần nhận dạng đã dùng — bước dựng tệp đi tiếp từ đây, không tụt về 0. */
  spent: number
}

async function recognizeMissing(sources: Record<string, SourceFile>, pages: PageRef[], buildUnits: number, step: FlowStep, options?: OcrPipelineOptions): Promise<Recognized> {
  const result: Recognized = { pages: 0, words: 0, native: 0, blank: 0, spent: 0 }
  const targets: PageRef[] = []
  const pageOptions = (page: PageRef) => options && page.id !== pages[0]?.id ? { ...options, perspective: undefined } : options
  for (const page of pages) {
    step.signal.throwIfAborted()
    const source = sources[page.sourceId]
    let earlier = ocrText(source.id, page)
    const currentOptions = pageOptions(page)
    if (currentOptions && earlier && earlier.ocr?.pipeline?.fingerprint !== ocrFingerprint(await ocrSourceHash(source), page, currentOptions)) {
      removeOcrText(source.id, page)
      earlier = undefined
    }
    if (earlier) {
      result.pages++
      result.words += earlier.ocr?.words.length ?? earlier.runs.length
      if ((earlier.ocr?.words.length ?? earlier.runs.length) === 0) result.blank++
      continue
    }
    const text = await loadPageText(source, page).catch(() => ({ runs: [] }))
    if (text.runs.length > 0) result.native++
    else targets.push(page)
  }

  result.spent = targets.length * OCR_WEIGHT
  const total = result.spent + buildUnits
  // tesseract không huỷ được giữa chừng: Huỷ = giết worker, `recognize` đang chờ sẽ ném lỗi.
  const onAbort = () => void stopOcr()
  step.signal.addEventListener('abort', onAbort)
  try {
    for (const [index, page] of targets.entries()) {
      step.signal.throwIfAborted()
      const label = translate('pdf:quickTask.ocrReading', { page: index + 1, total: targets.length })
      step.onProgress(index * OCR_WEIGHT, total, index === 0 ? translate('pdf:quickTask.ocrLoading') : label)
      const progressOf = ({ stage, progress }: import('./ocr').OcrProgress) => {
        if (stage === 'reading') step.onProgress((index + progress) * OCR_WEIGHT, total, label)
      }
      const currentOptions = pageOptions(page)
      const text = currentOptions ? await recognizePipeline(sources[page.sourceId], page, progressOf, step.signal, currentOptions) : await recognizePage(sources[page.sourceId], page, progressOf)
      step.signal.throwIfAborted()
      saveOcrText(page.sourceId, page, text)
      result.pages++
      result.words += text.ocr?.words.length ?? text.runs.length
      if ((text.ocr?.words.length ?? text.runs.length) === 0) result.blank++
    }
  } catch (error) {
    // Lỗi do chính việc giết worker không phải lỗi thật — để khung luồng thấy tín hiệu huỷ.
    step.signal.throwIfAborted()
    await stopOcr()
    throw error
  } finally {
    step.signal.removeEventListener('abort', onAbort)
  }
  return result
}

function ocrNotes(found: Recognized): FlowNote[] {
  const notes: FlowNote[] = []
  if (found.pages > 0) notes.push({ tone: 'success', text: translate('pdf:quickTask.ocrDone', { count: found.pages, words: found.words }) })
  if (found.native > 0) notes.push({ tone: 'info', text: translate('pdf:quickTask.ocrNative', { count: found.native }) })
  if (found.blank > 0) notes.push({ tone: 'warning', text: translate('pdf:quickTask.ocrBlank', { count: found.blank }) })
  return notes
}

async function textOf(items: QuickItem[]): Promise<string> {
  const files: string[] = []
  for (const item of items) {
    const pages: string[] = []
    for (const page of item.pages) pages.push(reviewedOcrText(await loadPageText(item.source, page)))
    const text = joinPageTexts(pages)
    if (text) files.push(items.length > 1 ? `=== ${item.source.name} ===\n${text}` : text)
  }
  return files.join('\n\n')
}

/**
 * Nhận dạng chữ tiếng Việt trên các trang chưa có lớp chữ. `pdf` = tệp PDF tìm,
 * chọn, chép được chữ (hình trang không đổi); `text` = văn bản thường.
 */
export function ocrTask(items: QuickItem[], kind: OcrOutput, review?: OcrReviewStep, options = DEFAULT_OCR_OPTIONS): FlowTask {
  return async (step): Promise<FlowResult> => {
    const context = contextOf(items)
    const pages = pagesOf(items)
    const buildUnits = kind === 'pdf' ? pages.length : 0
    const found = await recognizeMissing(context.sources, pages, buildUnits, step, options)
    if (found.words === 0 && found.native === 0 && !['table', 'form'].includes(options.profile)) throw new Error(translate('pdf:quickTask.ocrNoText'))
    if (review) {
      step.onProgress(0, 0, translate('pdf:ocrReview.title'))
      await review(items, step.signal)
      step.signal.throwIfAborted()
      const recognized = pages.map(page => ocrText(page.sourceId, page)).filter(text => text !== undefined)
      found.words = recognized.reduce((count, text) => count + text.runs.length, 0)
      found.blank = recognized.filter(text => text.runs.length === 0).length
      if (found.words === 0 && found.native === 0) throw new Error(translate('pdf:quickTask.ocrNoText'))
    }
    const notes = ocrNotes(found)

    if (kind !== 'pdf' && kind !== 'text') {
      const texts = await Promise.all(pages.map(page => loadPageText(context.sources[page.sourceId], page)))
      const blob = await exportReviewedOcr(texts, kind, step.signal)
      const extension = blob.type === 'application/zip' ? 'zip' : kind
      return { title: translate('ocr:exportDone'), output: { name: `${firstName(items)}.${extension}`, blob }, notes }
    }

    if (kind === 'text') {
      const text = await textOf(items)
      step.signal.throwIfAborted()
      const name = items.length === 1 ? firstName(items) : `${firstName(items)} - ${translate('pdf:file.fileCount', { count: items.length })}`
      return {
        title: translate('pdf:quickTask.textDone'),
        output: {
          name: `${name}.txt`,
          blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
          detail: translate('pdf:quickTask.chars', { count: text.length }),
        },
        notes,
        text,
      }
    }

    const build = {
      signal: step.signal,
      onProgress: (done: number) => step.onProgress(found.spent + done, found.spent + buildUnits, translate('pdf:quickTask.buildingPdf')),
    }
    if (items.length === 1) {
      const built = await buildPdf(context, pages, `${firstName(items)} - OCR`, DEFAULT_PDF_OUTPUT, build)
      return {
        title: translate('pdf:quickTask.searchablePdf'),
        output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })),
        notes: [...notes, ...carryoverNotes(built.carryover)],
      }
    }
    const built = await buildBatch(
      context,
      groupByOrigin(pages, context.sources),
      'pdf',
      { output: DEFAULT_PDF_OUTPUT, image: { format: 'jpeg', dpi: 150 } },
      translate('pdf:file.ocrBatch'),
      build,
    )
    return {
      title: translate('pdf:quickTask.searchablePdf'),
      output: output(built.file, translate('pdf:quickTask.pdfFiles', { count: items.length })),
      notes: [...notes, ...carryoverNotes(built.carryover)],
    }
  }
}

/** Mỗi ảnh một trang, đặt lên khổ giấy + lề đã chọn, theo thứ tự đang xếp. */
export function imagesToPdfTask(items: QuickItem[], sheet: ImageSheet): FlowTask {
  return async (step) => {
    const pages = isDefaultSheet(sheet) ? pagesOf(items) : pagesOf(items).map((page) => ({ ...page, sheet }))
    const name = items.length === 1 ? firstName(items) : `${firstName(items)} - ${translate('pdf:file.imageCount', { count: items.length })}`
    const built = await buildPdf(contextOf(items), pages, name, DEFAULT_PDF_OUTPUT, step)
    return {
      title: translate('pdf:quickTask.pdfPages', { count: pages.length }),
      output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })),
      notes: [],
    }
  }
}
