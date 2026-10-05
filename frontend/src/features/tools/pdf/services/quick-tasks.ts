import type { FlowNote, FlowResult, FlowStep, FlowTask } from '@/features/tools/hub'
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
import { ocrText, saveOcrText } from './ocr-store'
import { loadPageText } from './text-layer'

/**
 * Việc của các công cụ nhanh "Chuyện Nhỏ" làm trên CẢ TỆP (việc trên từng
 * trang — sắp xếp, đánh số, đóng dấu, che — ở `page-tasks`). Mỗi hàm nhận tệp + tuỳ chọn và
 * trả về một `FlowTask`: dựng tệp bằng đúng engine của trình chỉnh sửa
 * (`doc-build`), rồi nói ra bằng lời những gì người dùng cần biết về tệp vừa ra.
 */

export type ConvertTarget = OfficeKind | ImageFormat
export type OcrOutput = 'pdf' | 'text'

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
  const what = reduced.length === 1 ? 'Một trang khổ lớn' : `${reduced.length} trang khổ lớn`
  return [
    {
      tone: 'warning',
      text: `${what} chỉ xuất được ~${lowest} DPI (thay vì ${dpi}) — mỗi ảnh tối đa ${CANVAS_CAP.maxArea / 1_000_000} triệu điểm ảnh để trình duyệt không treo.`,
    },
  ]
}

function withoutTextNotes(count: number, target: ConvertTarget): FlowNote[] {
  if (count === 0 || (target !== 'word' && target !== 'excel')) return []
  const where = target === 'word' ? 'được chèn vào Word dạng ảnh' : 'nên để trống trong Excel'
  return [{ tone: 'warning', text: `${count} trang không có lớp chữ (ảnh, bản scan) ${where}. Chạy "OCR văn bản" trước rồi chuyển lại để lấy được chữ.` }]
}

/** Ghép mọi tệp theo thứ tự đang xếp thành một PDF. */
export function mergeTask(items: QuickItem[]): FlowTask {
  return async (step) => {
    const pages = pagesOf(items)
    const built = await buildPdf(contextOf(items), pages, `${firstName(items)} - đã ghép`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: `Đã ghép ${items.length} tệp thành 1 PDF`,
      output: output(built.file, `${pages.length} trang`),
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
        title: `Đã lấy ${part.pages.length} trang ra tệp riêng`,
        output: output(built.file, `${part.pages.length} trang`),
        notes: carryoverNotes(built.carryover),
      }
    }
    const built = await buildSplit(context, parts, name, DEFAULT_PDF_OUTPUT, step)
    return {
      title: `Đã tách thành ${parts.length} tệp PDF`,
      output: output(built.file, `${parts.length} tệp PDF`),
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
    notes.push({ tone: 'success', text: `${sizes} (${change})${stats.recompressed ? `, nén lại ${stats.recompressed} ảnh` : ''}.` })
  } else {
    const why =
      stats.recompressed === 0
        ? 'Tệp không có ảnh JPEG đủ lớn để nén lại — tệp toàn chữ hoặc ảnh PNG thường đã gọn sẵn.'
        : 'Ảnh trong tệp đã được nén gần hết mức từ trước.'
    notes.push({ tone: 'warning', text: `Tệp ra không nhẹ hơn tệp gốc (${sizes}). ${why} Nên giữ tệp gốc.` })
  }
  if (stats.flate) notes.push({ tone: 'info', text: `Giữ nguyên ${stats.flate} ảnh PNG / trắng đen để chữ không bị nhoè.` })
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
        ? await buildPdf(context, items[0].pages, `${firstName(items)} - đã nén`, pdfOutput, step)
        : await buildBatch(context, groupByOrigin(pagesOf(items), context.sources), 'pdf', { output: pdfOutput, image: { format: 'jpeg', dpi: 150 } }, 'PDF đã nén', step)
    const smaller = built.bytes < before
    return {
      title: smaller ? 'Đã nén xong' : 'Không nén thêm được',
      tone: smaller ? 'success' : 'warning',
      output: output(built.file, items.length === 1 ? `${items[0].pages.length} trang` : `${items.length} tệp PDF`),
      notes: [...compressionNotes(built.compression, before, built.bytes), ...carryoverNotes(built.carryover)],
    }
  }
}

const TARGET_NAME: Record<ConvertTarget, string> = { word: 'Word', excel: 'Excel', jpeg: 'ảnh JPG', png: 'ảnh PNG' }

/** PDF → Word / Excel / ảnh từng trang; nhiều tệp thì mỗi tệp một kết quả, gói chung một .zip. */
export function convertTask(items: QuickItem[], target: ConvertTarget, dpi: number): FlowTask {
  return async (step) => {
    const context = contextOf(items)
    const pages = pagesOf(items)
    const title = `Đã chuyển sang ${TARGET_NAME[target]}`
    const office = target === 'word' || target === 'excel'

    if (items.length > 1) {
      const built = await buildBatch(
        context,
        groupByOrigin(pages, context.sources),
        office ? target : 'image',
        { output: DEFAULT_PDF_OUTPUT, image: { format: office ? 'jpeg' : target, dpi } },
        `Chuyển sang ${TARGET_NAME[target]}`,
        step,
      )
      return {
        title,
        output: output(built.file, `${items.length} tệp`),
        notes: [...withoutTextNotes(built.withoutText, target), ...reducedNotes(built.reduced, dpi)],
      }
    }
    if (office) {
      const built = await buildOffice(context, target, pages, firstName(items), step)
      return { title, output: output(built.file, `${pages.length} trang`), notes: withoutTextNotes(built.withoutText, target) }
    }
    const built = await buildImages(context, pages, target, dpi, firstName(items), step)
    return {
      title,
      output: output(built.file, pages.length === 1 ? `${dpi} DPI` : `${pages.length} ảnh · ${dpi} DPI`),
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

async function recognizeMissing(sources: Record<string, SourceFile>, pages: PageRef[], buildUnits: number, step: FlowStep): Promise<Recognized> {
  const result: Recognized = { pages: 0, words: 0, native: 0, blank: 0, spent: 0 }
  const targets: PageRef[] = []
  for (const page of pages) {
    step.signal.throwIfAborted()
    const source = sources[page.sourceId]
    const earlier = ocrText(source.id, page)
    if (earlier) {
      result.pages++
      result.words += earlier.runs.length
      if (earlier.runs.length === 0) result.blank++
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
      const label = `Đang nhận dạng trang ${index + 1}/${targets.length}`
      step.onProgress(index * OCR_WEIGHT, total, index === 0 ? 'Đang tải bộ nhận dạng tiếng Việt' : label)
      const text = await recognizePage(sources[page.sourceId], page, ({ stage, progress }) => {
        if (stage === 'reading') step.onProgress((index + progress) * OCR_WEIGHT, total, label)
      })
      step.signal.throwIfAborted()
      saveOcrText(page.sourceId, page, text)
      result.pages++
      result.words += text.runs.length
      if (text.runs.length === 0) result.blank++
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
  if (found.pages > 0) notes.push({ tone: 'success', text: `Đã nhận dạng ${found.pages} trang (${found.words.toLocaleString('vi-VN')} từ).` })
  if (found.native > 0) notes.push({ tone: 'info', text: `${found.native} trang đã có sẵn lớp chữ — giữ nguyên, không nhận dạng lại.` })
  if (found.blank > 0) notes.push({ tone: 'warning', text: `${found.blank} trang không đọc được chữ nào — ảnh có thể quá mờ, quá nhỏ hoặc không có chữ.` })
  return notes
}

async function textOf(items: QuickItem[]): Promise<string> {
  const files: string[] = []
  for (const item of items) {
    const pages: string[] = []
    for (const page of item.pages) pages.push(plainText(await loadPageText(item.source, page)))
    const text = joinPageTexts(pages)
    if (text) files.push(items.length > 1 ? `=== ${item.source.name} ===\n${text}` : text)
  }
  return files.join('\n\n')
}

/**
 * Nhận dạng chữ tiếng Việt trên các trang chưa có lớp chữ. `pdf` = tệp PDF tìm,
 * chọn, chép được chữ (hình trang không đổi); `text` = văn bản thường.
 */
export function ocrTask(items: QuickItem[], kind: OcrOutput): FlowTask {
  return async (step): Promise<FlowResult> => {
    const context = contextOf(items)
    const pages = pagesOf(items)
    const buildUnits = kind === 'pdf' ? pages.length : 0
    const found = await recognizeMissing(context.sources, pages, buildUnits, step)
    if (found.words === 0 && found.native === 0) throw new Error('không đọc được chữ nào — ảnh có thể quá mờ, quá nhỏ hoặc không có chữ.')
    const notes = ocrNotes(found)

    if (kind === 'text') {
      const text = await textOf(items)
      step.signal.throwIfAborted()
      const name = items.length === 1 ? firstName(items) : `${firstName(items)} - ${items.length} tệp`
      return {
        title: 'Đã lấy chữ xong',
        output: { name: `${name}.txt`, blob: new Blob([text], { type: 'text/plain;charset=utf-8' }), detail: `${text.length.toLocaleString('vi-VN')} ký tự` },
        notes,
        text,
      }
    }

    const build = {
      signal: step.signal,
      onProgress: (done: number) => step.onProgress(found.spent + done, found.spent + buildUnits, 'Đang dựng tệp PDF'),
    }
    if (items.length === 1) {
      const built = await buildPdf(context, pages, `${firstName(items)} - OCR`, DEFAULT_PDF_OUTPUT, build)
      return { title: 'Đã tạo PDF tìm được chữ', output: output(built.file, `${pages.length} trang`), notes: [...notes, ...carryoverNotes(built.carryover)] }
    }
    const built = await buildBatch(
      context,
      groupByOrigin(pages, context.sources),
      'pdf',
      { output: DEFAULT_PDF_OUTPUT, image: { format: 'jpeg', dpi: 150 } },
      'PDF đã OCR',
      build,
    )
    return { title: 'Đã tạo PDF tìm được chữ', output: output(built.file, `${items.length} tệp PDF`), notes: [...notes, ...carryoverNotes(built.carryover)] }
  }
}

/** Mỗi ảnh một trang, đặt lên khổ giấy + lề đã chọn, theo thứ tự đang xếp. */
export function imagesToPdfTask(items: QuickItem[], sheet: ImageSheet): FlowTask {
  return async (step) => {
    const pages = isDefaultSheet(sheet) ? pagesOf(items) : pagesOf(items).map((page) => ({ ...page, sheet }))
    const name = items.length === 1 ? firstName(items) : `${firstName(items)} - ${items.length} ảnh`
    const built = await buildPdf(contextOf(items), pages, name, DEFAULT_PDF_OUTPUT, step)
    return {
      title: `Đã tạo PDF ${pages.length} trang`,
      output: output(built.file, `${pages.length} trang`),
      notes: [],
    }
  }
}
