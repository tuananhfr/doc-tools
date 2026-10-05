import { createZipWriter } from '@/features/tools/shared'
import { newId } from '@/utils/id'
import type { ImageFormat, PageRef, PdfOutput, SourceFile } from '../types/doc-tools.types'
import type { BatchGroup } from '../utils/batch-groups'
import { addCarryover, NO_CARRYOVER, type CarryoverReport } from '../utils/carryover-summary'
import { addStats, NO_COMPRESSION_STATS, type CompressionStats } from '../utils/compression'
import { formatStampDate, isDecorated, type ResolvedDecorations } from '../utils/decorations'
import { sanitizeFileName } from '../utils/file-guard'
import { hasMarkups } from '../utils/markup-geometry'
import { createPacer, type WorkStep } from '../utils/work-step'
import { assemblePdf } from './pdf-assemble'
import { releaseDocument } from './pdf-render'
import { renderPageImage } from './pdf-to-image'
import { toExcel, toWord } from './pdf-to-office'

/**
 * DỰNG tệp kết quả và TRẢ VỀ, không tải xuống. Hai nơi dùng chung: trình chỉnh
 * sửa (`useDocExport` — dựng xong tải ngay) và các công cụ nhanh của "Chuyện
 * Nhỏ" (đưa tệp lên màn kết quả, người dùng tự bấm Tải về).
 */

export type OfficeKind = 'word' | 'excel'
export type BatchFormat = 'pdf' | 'image' | OfficeKind

export interface BuiltFile {
  name: string
  blob: Blob
}

export interface BuildContext {
  sources: Record<string, SourceFile>
  /** Số trang / watermark của trình chỉnh sửa; công cụ nhanh không có. */
  decorations?: ResolvedDecorations
}

export interface PdfBuild {
  file: BuiltFile
  compression: CompressionStats
  carryover: CarryoverReport
  /** Tổng byte PDF đã dựng (với .zip: cộng các tệp bên trong) — mốc so sánh khi báo kết quả nén. */
  bytes: number
}

export interface ImageBuild {
  file: BuiltFile
  /** DPI thật của các trang bị hạ vì chạm trần canvas. */
  reduced: number[]
}

export interface OfficeBuild {
  file: BuiltFile
  withoutText: number
}

export interface BatchBuild extends PdfBuild {
  reduced: number[]
  withoutText: number
}

export interface SplitGroup {
  label: string
  pages: PageRef[]
}

export interface BatchOptions {
  output: PdfOutput
  image: { format: ImageFormat; dpi: number }
}

const EXTENSION: Record<ImageFormat, string> = { jpeg: 'jpg', png: 'png' }
const OFFICE_EXTENSION: Record<OfficeKind, string> = { word: 'docx', excel: 'xlsx' }

/** Tên ảnh trong .zip: số trang đệm 0 để giải nén ra vẫn xếp đúng thứ tự. */
function imageName(title: string, index: number, count: number, extension: string): string {
  return `${title} - ${String(index + 1).padStart(Math.max(3, String(count).length), '0')}.${extension}`
}

function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

function decorationsOf(context: BuildContext): ResolvedDecorations | undefined {
  return context.decorations && isDecorated(context.decorations) ? context.decorations : undefined
}

/** Mỗi lần gọi là MỘT tệp xuất — `{n}/{N}` đếm lại từ đầu trong tệp đó. */
function assemble(context: BuildContext, pages: PageRef[], title: string, output?: PdfOutput, step?: WorkStep) {
  return assemblePdf(pages, context.sources, {
    title,
    decorations: decorationsOf(context),
    stamp: { fileName: title, date: formatStampDate(new Date()) },
    output,
    step,
  })
}

export async function buildPdf(context: BuildContext, pages: PageRef[], name: string, output: PdfOutput, step: WorkStep = {}): Promise<PdfBuild> {
  const title = sanitizeFileName(name)
  const pdf = await assemble(context, pages, title, output, step)
  step.signal?.throwIfAborted()
  return { file: { name: `${title}.pdf`, blob: pdfBlob(pdf.bytes) }, compression: pdf.compression, carryover: pdf.carryover, bytes: pdf.bytes.byteLength }
}

/** Mỗi nhóm trang một tệp PDF, gói chung một .zip. */
export async function buildSplit(context: BuildContext, groups: SplitGroup[], name: string, output: PdfOutput, step: WorkStep = {}): Promise<PdfBuild> {
  const title = sanitizeFileName(name)
  const zip = createZipWriter()
  const pageTotal = groups.reduce((sum, group) => sum + group.pages.length, 0)
  let compression = NO_COMPRESSION_STATS
  let carryover = NO_CARRYOVER
  let bytes = 0
  let offset = 0
  for (const [index, group] of groups.entries()) {
    const pdf = await assemble(context, group.pages, title, output, {
      signal: step.signal,
      onProgress: (done) => step.onProgress?.(offset + done, pageTotal),
    })
    zip.add(`${title} - phần ${index + 1} (tr ${group.label}).pdf`, pdf.bytes)
    compression = addStats(compression, pdf.compression)
    carryover = addCarryover(carryover, pdf.carryover)
    bytes += pdf.bytes.byteLength
    offset += group.pages.length
  }
  step.signal?.throwIfAborted()
  return { file: { name: `${title} - đã tách.zip`, blob: zip.finish() }, compression, carryover, bytes }
}

/**
 * Ảnh từng trang, đưa lần lượt cho `emit` (không giữ cả lô trong bộ nhớ).
 * Trả về DPI thật của các trang bị hạ vì chạm trần canvas.
 */
async function renderImages(
  context: BuildContext,
  pages: PageRef[],
  format: ImageFormat,
  dpi: number,
  title: string,
  step: WorkStep,
  emit: (index: number, blob: Blob) => Promise<void>,
): Promise<number[]> {
  // Có trang trí / đánh dấu thì chụp từ PDF đã dựng — vẽ thẳng từ nguồn là mất chúng.
  let targets = pages.map((page) => ({ page, source: context.sources[page.sourceId] }))
  let temporary: string | null = null
  const rebuild = !!decorationsOf(context) || hasMarkups(pages)
  // Dựng lại rồi mới chụp = hai lượt qua mọi trang; thanh tiến độ đi một mạch, không tụt về 0.
  const steps = rebuild ? pages.length * 2 : pages.length
  if (rebuild) {
    const { bytes } = await assemble(context, pages, title, undefined, {
      signal: step.signal,
      onProgress: (done) => step.onProgress?.(done, steps),
    })
    const source: SourceFile = {
      id: newId(),
      name: `${title}.pdf`,
      kind: 'pdf',
      mime: 'application/pdf',
      bytes: bytes as Uint8Array<ArrayBuffer>,
      size: bytes.byteLength,
      pageCount: pages.length,
    }
    temporary = source.id
    targets = pages.map((page, pageIndex) => ({ page: { ...page, sourceId: source.id, pageIndex, rotation: 0, markups: undefined }, source }))
  }

  const reduced: number[] = []
  try {
    const pace = createPacer()
    for (const [index, target] of targets.entries()) {
      await pace(step.signal)
      step.onProgress?.(steps - targets.length + index, steps)
      const image = await renderPageImage(target.page, target.source, format, dpi)
      if (image.dpi < dpi - 0.5) reduced.push(image.dpi)
      await emit(index, image.blob)
    }
    step.onProgress?.(steps, steps)
  } finally {
    if (temporary) releaseDocument(temporary)
  }
  return reduced
}

/** Một trang → một ảnh; nhiều trang → .zip ảnh. */
export async function buildImages(context: BuildContext, pages: PageRef[], format: ImageFormat, dpi: number, name: string, step: WorkStep = {}): Promise<ImageBuild> {
  const title = sanitizeFileName(name)
  const extension = EXTENSION[format]
  const zip = pages.length > 1 ? createZipWriter() : null
  let single: Blob | null = null
  const reduced = await renderImages(context, pages, format, dpi, title, step, async (index, blob) => {
    if (!zip) {
      single = blob
      return
    }
    zip.add(imageName(title, index, pages.length, extension), new Uint8Array(await blob.arrayBuffer()))
  })
  step.signal?.throwIfAborted()
  if (zip) return { file: { name: `${title} - ảnh.zip`, blob: zip.finish() }, reduced }
  if (!single) throw new Error('không có trang nào để xuất ảnh')
  return { file: { name: `${title}.${extension}`, blob: single }, reduced }
}

/** Chỉ dựng từ lớp chữ của tệp nguồn — dấu tay, số trang, watermark không đi theo. */
export async function buildOffice(context: BuildContext, kind: OfficeKind, pages: PageRef[], name: string, step: WorkStep = {}): Promise<OfficeBuild> {
  const title = sanitizeFileName(name)
  const targets = pages.map((page) => ({ page, source: context.sources[page.sourceId] }))
  const result = kind === 'word' ? await toWord(targets, title, step) : await toExcel(targets, title, step)
  step.signal?.throwIfAborted()
  return { file: { name: `${title}.${OFFICE_EXTENSION[kind]}`, blob: result.blob }, withoutText: result.withoutText }
}

/**
 * Xử lý hàng loạt: mỗi tệp gốc thành một tệp ra theo cùng thiết lập, gói
 * chung một .zip. Mỗi tệp đánh số trang / dấu riêng như xuất từng tệp một.
 */
export async function buildBatch(
  context: BuildContext,
  groups: BatchGroup[],
  format: BatchFormat,
  options: BatchOptions,
  name: string,
  step: WorkStep = {},
): Promise<BatchBuild> {
  const zip = createZipWriter()
  const pageTotal = groups.reduce((sum, group) => sum + group.pages.length, 0)
  let offset = 0
  let compression = NO_COMPRESSION_STATS
  let carryover = NO_CARRYOVER
  let bytes = 0
  let withoutText = 0
  const reduced: number[] = []
  for (const group of groups) {
    const title = sanitizeFileName(group.name)
    const sub: WorkStep = {
      signal: step.signal,
      onProgress: (done, total) => step.onProgress?.(offset + (total > 0 ? (done / total) * group.pages.length : 0), pageTotal),
    }
    if (format === 'pdf') {
      const pdf = await assemble(context, group.pages, title, options.output, sub)
      zip.add(`${title}.pdf`, pdf.bytes)
      compression = addStats(compression, pdf.compression)
      carryover = addCarryover(carryover, pdf.carryover)
      bytes += pdf.bytes.byteLength
    } else if (format === 'image') {
      const extension = EXTENSION[options.image.format]
      const lost = await renderImages(context, group.pages, options.image.format, options.image.dpi, title, sub, async (index, blob) => {
        zip.add(imageName(title, index, group.pages.length, extension), new Uint8Array(await blob.arrayBuffer()))
      })
      reduced.push(...lost)
    } else {
      const targets = group.pages.map((page) => ({ page, source: context.sources[page.sourceId] }))
      const result = format === 'word' ? await toWord(targets, title, sub) : await toExcel(targets, title, sub)
      zip.add(`${title}.${OFFICE_EXTENSION[format]}`, new Uint8Array(await result.blob.arrayBuffer()))
      withoutText += result.withoutText
    }
    offset += group.pages.length
  }
  step.signal?.throwIfAborted()
  return { file: { name: `${sanitizeFileName(name)} - ${groups.length} tệp.zip`, blob: zip.finish() }, compression, carryover, bytes, reduced, withoutText }
}
