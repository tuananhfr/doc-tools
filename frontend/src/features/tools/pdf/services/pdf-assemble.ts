import { degrees, PDFDocument, type PDFImage, type PDFPage } from 'pdf-lib'
import type { StampMeta } from '../types/decorations.types'
import { DEFAULT_PDF_OUTPUT, type PageRef, type PdfOutput, type SourceFile } from '../types/doc-tools.types'
import type { Markup } from '../types/markup.types'
import type { CarryoverReport } from '../utils/carryover-summary'
import type { CompressionStats } from '../utils/compression'
import type { ResolvedDecorations } from '../utils/decorations'
import { pdfImagePlacement } from '../utils/image-sheet'
import { redactBoxes } from '../utils/redaction'
import { createPacer, type WorkStep } from '../utils/work-step'
import { ocrText } from './ocr-store'
import { sheetLayoutOf, sheetParts } from './page-size'
import { annotateMarkups } from './pdf-annotate'
import { finishCarryover, prepareSource, type PlacedPage, type PreparedSource } from './pdf-carryover'
import { compressImages } from './pdf-compress'
import { decorateDocument } from './pdf-decorate'
import { dedupeObjects } from './pdf-dedupe'
import { drawOcrText } from './pdf-ocr-layer'
import { createFontLoader, type FontLoader } from './pdf-fonts'
import { drawMarkups } from './pdf-markup'
import { addRedactedPage } from './pdf-redact'

const PRODUCER = 'ERPCons DocTools'

export interface AssembleOptions {
  title?: string
  decorations?: ResolvedDecorations
  stamp?: StampMeta
  output?: PdfOutput
  step?: WorkStep
}

export interface AssembledPdf {
  bytes: Uint8Array
  compression: CompressionStats
  carryover: CarryoverReport
}

/** Trang đã OCR mang theo lớp chữ ẩn — tệp xuất tìm được chữ, nạp lại khỏi phải nhận dạng lần nữa. */
async function drawRecognizedText(page: PDFPage, sourceId: string, ref: PageRef, fonts: FontLoader) {
  const recognized = ocrText(sourceId, ref)
  if (recognized) await drawOcrText(page, recognized.runs, fonts)
}

async function placeMarkups(doc: PDFDocument, page: PDFPage, markups: Markup[], fonts: FontLoader, output: PdfOutput) {
  const flat = output.markupOutput === 'annotations' ? await annotateMarkups(doc, page, markups, fonts) : markups
  if (flat.length) await drawMarkups(page, flat, fonts)
}

const isRedacted = (ref: PageRef) => redactBoxes(ref.markups).length > 0

/**
 * Dựng MỘT tệp PDF mới từ danh sách trang. Tệp nguồn không bị đụng tới
 * (spec 02 — không ghi đè Original; spec 01 — lỗi không được làm hỏng nguồn).
 */
export async function assemblePdf(
  pages: PageRef[],
  sources: Record<string, SourceFile>,
  { title, decorations, stamp, output: pdfOutput = DEFAULT_PDF_OUTPUT, step }: AssembleOptions = {},
): Promise<AssembledPdf> {
  const pace = createPacer()
  const output = await PDFDocument.create()
  const loaded = new Map<string, PDFDocument>()
  const images = new Map<string, PDFImage>()
  const fonts = createFontLoader(output)
  const prepared: PreparedSource[] = []
  const placed: PlacedPage[] = []

  // Chép theo lô cho mỗi tệp nguồn: `copyPages` từng trang một chép lại font và
  // tài nguyên dùng chung mỗi lần → tệp ra phình gấp nhiều lần.
  const firstCopies = new Map<string, Map<number, PDFPage>>()
  for (const ref of pages) {
    const source = sources[ref.sourceId]
    if (source?.kind !== 'pdf' || firstCopies.has(source.id)) continue

    await pace(step?.signal)
    const doc = await PDFDocument.load(source.bytes, { updateMetadata: false })
    loaded.set(source.id, doc)

    // Trang có khung xoá không được chép: nó được dựng lại thành ảnh ở vòng dưới.
    const indices = [...new Set(pages.filter((page) => page.sourceId === source.id && !isRedacted(page)).map((page) => page.pageIndex))]
    // Phải chạy TRƯỚC copyPages: bản nạp này chỉ dùng cho lần dựng này, sửa thoải mái.
    prepared.push(prepareSource(doc, source.id, indices))
    const copied = await output.copyPages(doc, indices)
    firstCopies.set(source.id, new Map(indices.map((index, position) => [index, copied[position]])))
  }

  for (const [position, ref] of pages.entries()) {
    await pace(step?.signal)
    step?.onProgress?.(position, pages.length)
    const source = sources[ref.sourceId]
    if (!source) throw new Error('Thiếu tệp nguồn của một trang.')

    if (isRedacted(ref)) {
      const page = await addRedactedPage(output, ref, source, fonts)
      // Vẫn ghi vào danh sách để liên kết từ trang khác trỏ tới trang này còn sống.
      placed.push({ page, sourceKey: source.id, pageIndex: ref.pageIndex })
      const rest = ref.markups!.filter((markup) => markup.kind !== 'redact')
      if (rest.length) await placeMarkups(output, page, rest, fonts, pdfOutput)
      if (ref.rotation) page.setRotation(degrees(ref.rotation))
      continue
    }

    if (source.kind === 'pdf') {
      const batch = firstCopies.get(source.id)!
      let page = batch.get(ref.pageIndex)
      if (page) {
        batch.delete(ref.pageIndex)
      } else {
        // Trang nhân bản: một đối tượng trang chỉ được có MỘT cha trong cây
        // trang, thêm lại cùng đối tượng là PDF sai cấu trúc → chép bản mới.
        ;[page] = await output.copyPages(loaded.get(source.id)!, [ref.pageIndex])
      }
      output.addPage(page)
      placed.push({ page, sourceKey: source.id, pageIndex: ref.pageIndex })
      await drawRecognizedText(page, source.id, ref, fonts)
      if (ref.markups?.length) await placeMarkups(output, page, ref.markups, fonts, pdfOutput)
      if (ref.rotation) page.setRotation(degrees((page.getRotation().angle + ref.rotation) % 360))
      continue
    }

    const layout = await sheetLayoutOf(source, ref.sheet)
    const page = output.addPage([layout.size.width, layout.size.height])
    for (const [index, part] of sheetParts(source).entries()) {
      let image = images.get(part.source.id)
      if (!image) {
        // Cùng một ảnh trên nhiều trang (nhân bản, gộp lại) chỉ nhúng MỘT lần.
        image = part.source.mime === 'image/png' ? await output.embedPng(part.source.bytes) : await output.embedJpg(part.source.bytes)
        images.set(part.source.id, image)
      }
      const placement = pdfImagePlacement(layout.slots[index], part.rotation, layout.size.height)
      page.drawImage(image, { ...placement, rotate: degrees(placement.rotate) })
    }
    await drawRecognizedText(page, source.id, ref, fonts)
    if (ref.markups?.length) await placeMarkups(output, page, ref.markups, fonts, pdfOutput)
    if (ref.rotation) page.setRotation(degrees(ref.rotation))
  }

  // Chốt chặn cuối: tệp thiếu trang mà vẫn tải về thì người dùng chỉ phát hiện khi đã nộp đi.
  if (output.getPageCount() !== pages.length) {
    throw new Error(`tệp dựng ra có ${output.getPageCount()}/${pages.length} trang`)
  }
  step?.onProgress?.(pages.length, pages.length)
  step?.signal?.throwIfAborted()
  const carryover = finishCarryover(output, prepared, placed)
  if (decorations) await decorateDocument(output, pages, decorations, stamp ?? { fileName: title ?? '', date: '' }, fonts)
  const compression = await compressImages(output, pdfOutput.compression)
  // Sau cùng: mọi bước trên còn sửa từng trang, gộp sớm là sửa trang này đổi cả trang kia.
  dedupeObjects(output)

  output.setProducer(PRODUCER)
  output.setCreator(PRODUCER)
  if (title) output.setTitle(title)
  return { bytes: await output.save(), compression, carryover }
}
