import { translate } from '@/i18n/runtime'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { guessFontStyle, PLAIN_FONT, type FontStyle } from '../utils/font-style'
import { normalizeRotation, visualSize, type Size } from '../utils/page-geometry'
import { redactBoxes, runsOutside } from '../utils/redaction'
import { buildParagraphs, buildTable, layoutPage, tableValues, type LayoutSegment, type PageLayout } from '../utils/text-layout'
import { createPacer, type WorkStep } from '../utils/work-step'
import { basePageSize } from './page-size'
import { renderPageImage } from './pdf-to-image'
import { openPdf } from './pdf-render'
import { loadPageText } from './text-layer'

/**
 * PDF → Word / Excel, dựng lại từ lớp chữ (best-effort). Thư viện docx /
 * exceljs nặng cả trăm KB nên chỉ nạp khi người dùng bấm chuyển.
 */

export interface OfficeTarget {
  page: PageRef
  source: SourceFile
}

export interface OfficeResult {
  blob: Blob
  /** Trang không có lớp chữ (ảnh, bản scan): Word chèn thành ảnh, Excel để trống. */
  withoutText: number
}

/** pt → twip (1/20 pt) — đơn vị đo của Word. */
const twips = (pt: number) => Math.round(pt * 20)
/** ImageRun của docx đo bằng điểm ảnh 96 DPI. */
const pxAt96 = (pt: number) => Math.round((pt * 96) / 72)
/** Lề trang Word: bám vùng chữ gốc nhưng không sát mép quá, không rộng quá. */
const clampMargin = (pt: number) => Math.min(72, Math.max(18, pt))
const IMAGE_DPI = 150

interface PageContent {
  layout: PageLayout
  fonts: Map<string, FontStyle>
  size: Size
}

/**
 * Kiểu phông thật chỉ có sau khi pdf.js nạp font (lúc dựng operator list) —
 * lớp chữ chỉ có tên nội bộ `g_d0_f1`. Lỗi thì coi như chữ thường.
 */
async function pageFonts(source: SourceFile, pageIndex: number, runs: { fontName: string; fontFamily: string }[]): Promise<Map<string, FontStyle>> {
  const fonts = new Map<string, FontStyle>()
  if (source.kind !== 'pdf') return fonts
  try {
    const page = await (await openPdf(source)).getPage(pageIndex + 1)
    await page.getOperatorList()
    for (const run of runs) {
      if (fonts.has(run.fontName)) continue
      const font = page.commonObjs.has(run.fontName)
        ? (page.commonObjs.get(run.fontName) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean } | null)
        : null
      const guessed = guessFontStyle(font?.name ?? '', run.fontFamily)
      fonts.set(run.fontName, { ...guessed, bold: guessed.bold || Boolean(font?.bold || font?.black), italic: guessed.italic || Boolean(font?.italic) })
    }
  } catch {
    // Không đọc được font thì vẫn chuyển được chữ — chỉ mất đậm / nghiêng.
  }
  return fonts
}

async function readPage({ page, source }: OfficeTarget): Promise<PageContent | null> {
  const runs = runsOutside((await loadPageText(source, page)).runs, redactBoxes(page.markups))
  if (runs.length === 0) return null
  const base = await basePageSize(source, page)
  const layout = layoutPage(runs, base)
  if (layout.lines.length === 0 && layout.rotated.length === 0) return null
  return { layout, fonts: await pageFonts(source, page.pageIndex, runs), size: layout.size ?? base }
}

const styleOf = (content: PageContent, segment: LayoutSegment) => content.fonts.get(segment.fontName) ?? PLAIN_FONT

export async function toWord(targets: OfficeTarget[], title: string, step?: WorkStep): Promise<OfficeResult> {
  const docx = await import('./docx-lib')
  const { AlignmentType, Document, ImageRun, Packer, PageOrientation, Paragraph, Tab, TabStopType, TextRun } = docx
  let withoutText = 0

  const pageSize = (size: Size) =>
    size.width > size.height
      ? // docx tự đảo w/h khi LANDSCAPE — truyền theo chiều dọc.
        { width: twips(size.height), height: twips(size.width), orientation: PageOrientation.LANDSCAPE }
      : { width: twips(size.width), height: twips(size.height), orientation: PageOrientation.PORTRAIT }

  const sections = []
  const pace = createPacer()
  for (const [position, target] of targets.entries()) {
    await pace(step?.signal)
    step?.onProgress?.(position, targets.length)
    const content = await readPage(target)
    if (!content) {
      withoutText++
      const turn = normalizeRotation(target.page.rotation)
      const size = visualSize(await basePageSize(target.source, target.page), turn)
      const { blob } = await renderPageImage(target.page, target.source, 'jpeg', IMAGE_DPI)
      const bitmap = await createImageBitmap(blob)
      // Chừa 1% — ảnh cao đúng bằng trang là Word đẩy dấu đoạn sang một trang trắng.
      const scale = Math.min(size.width / bitmap.width, size.height / bitmap.height) * 0.99
      const image = { width: pxAt96(bitmap.width * scale), height: pxAt96(bitmap.height * scale) }
      bitmap.close()
      sections.push({
        properties: { page: { size: pageSize(size), margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ type: 'jpg', data: await blob.arrayBuffer(), transformation: image })],
          }),
        ],
      })
      continue
    }

    const { layout, size } = content
    const lines = layout.lines
    const left = clampMargin(lines.length ? Math.min(...lines.map((line) => line.x)) : 36)
    const right = clampMargin(lines.length ? size.width - Math.max(...lines.map((line) => line.right)) : 36)
    const top = clampMargin(lines.length ? lines[0].baseline - lines[0].size : 36)

    const children = buildParagraphs(lines).map((paragraph) => {
      const runs = paragraph.lines.flatMap((line, lineIndex) =>
        line.segments.flatMap((segment, index) => {
          const style = styleOf(content, segment)
          const prefix = lineIndex > 0 && index === 0 ? ' ' : ''
          return new TextRun({
            children: paragraph.tabular && index > 0 ? [new Tab(), segment.text] : [prefix + segment.text],
            bold: style.bold,
            italics: style.italic,
            size: Math.max(2, Math.round(segment.size * 2)),
            font: style.serif ? 'Times New Roman' : 'Arial',
          })
        }),
      )
      // Word đo thụt dòng và tab từ LỀ trang — lề đã bị kẹp nên không trùng mép vùng chữ.
      const indent = paragraph.align === 'left' ? Math.max(0, paragraph.lines[0].x - left) : 0
      return new Paragraph({
        children: runs,
        alignment: paragraph.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        indent: indent > 1 ? { left: twips(indent) } : undefined,
        spacing: { before: twips(Math.min(paragraph.spaceBefore, 72)), after: 0 },
        // Tab căn ô theo đúng vị trí gốc — dòng bảng kê giữ được cột mà không cần dựng bảng Word.
        tabStops: paragraph.tabular
          ? paragraph.lines[0].segments.slice(1).map((segment) => ({ type: TabStopType.LEFT, position: twips(Math.max(0, segment.x - left)) }))
          : undefined,
      })
    })
    for (const text of layout.rotated) children.push(new Paragraph({ children: [new TextRun({ text, italics: true })] }))

    sections.push({
      properties: { page: { size: pageSize(size), margin: { top: twips(top), right: twips(right), bottom: twips(36), left: twips(left) } } },
      children,
    })
  }

  step?.onProgress?.(targets.length, targets.length)
  step?.signal?.throwIfAborted()
  const document = new Document({ title, creator: 'ERPCons DocTools', sections })
  return { blob: await Packer.toBlob(document), withoutText }
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** Ký tự Excel cấm trong tên sheet. */
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g

export async function toExcel(targets: OfficeTarget[], title: string, step?: WorkStep): Promise<OfficeResult> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ERPCons DocTools'
  workbook.title = title
  let withoutText = 0

  const pace = createPacer()
  for (const [position, target] of targets.entries()) {
    await pace(step?.signal)
    step?.onProgress?.(position, targets.length)
    const sheet = workbook.addWorksheet(translate('pdf:file.sheet', { page: position + 1 }).replace(SHEET_NAME_FORBIDDEN, ' '))
    const content = await readPage(target)
    if (!content) {
      withoutText++
      sheet.getCell('A1').value = translate('pdf:file.noTextSheet')
      sheet.getCell('A1').font = { italic: true }
      continue
    }

    const table = buildTable(content.layout.lines)
    const values = tableValues(table)
    table.rows.forEach((row, rowIndex) => {
      const excelRow = sheet.addRow(values[rowIndex])
      row.forEach((_text, column) => {
        const segment = table.cells[rowIndex][column]
        if (!segment) return
        const cell = excelRow.getCell(column + 1)
        const style = styleOf(content, segment)
        if (style.bold || style.italic) cell.font = { bold: style.bold, italic: style.italic }
        if (typeof cell.value === 'number') cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.##'
      })
    })
    for (const text of content.layout.rotated) sheet.addRow([text]).getCell(1).font = { italic: true }
    table.columns.forEach((column, index) => {
      const width = Number.isFinite(column.right) ? column.right - column.x : 400
      // ~5,5 pt mỗi ký tự ở cỡ 10–11 — độ rộng cột Excel tính bằng ký tự.
      sheet.getColumn(index + 1).width = Math.min(60, Math.max(8, Math.round(width / 5.5) + 2))
    })
  }

  step?.onProgress?.(targets.length, targets.length)
  step?.signal?.throwIfAborted()
  const buffer = await workbook.xlsx.writeBuffer()
  return { blob: new Blob([buffer], { type: XLSX_MIME }), withoutText }
}
