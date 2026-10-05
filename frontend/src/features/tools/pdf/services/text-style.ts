import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import type { TextRun } from '../types/text-layer.types'
import { sampleColors } from '../utils/color-sample'
import type { Rgb } from '../utils/decorations'
import { guessFontStyle } from '../utils/font-style'
import type { TextLook } from '../utils/markup-draft'
import { PDF_CSS_SCALE, renderPreview } from './page-preview'
import { basePageSize } from './page-size'
import { openPdf } from './pdf-render'
import { sheetKey } from '../utils/image-sheet'

/** Trang cần lấy mẫu — chỉ những gì quyết định hình ảnh ở khung gốc. */
export type SampledPage = Pick<PageRef, 'pageIndex' | 'sheet'>

interface PagePixels {
  data: Uint8ClampedArray
  width: number
  /** Điểm ảnh / pt. */
  scale: number
}

// 3 điểm ảnh/pt: nét chữ 8 pt dày ~1 pt vẫn có vài điểm ảnh "lõi" không bị khử răng cưa làm nhạt màu.
const SAMPLE_SCALE = 3
const KEEP = 2
const pixels = new Map<string, Promise<PagePixels>>()

/** Ảnh trang ở khung gốc (chưa xoay thêm), giữ 2 trang gần nhất — tìm & thay chạy lần lượt từng trang. */
function pagePixels(source: SourceFile, page: SampledPage): Promise<PagePixels> {
  const key = `${source.id}:${page.pageIndex}:${sheetKey(page.sheet)}`
  let entry = pixels.get(key)
  if (entry) {
    pixels.delete(key)
    pixels.set(key, entry)
    return entry
  }
  entry = (async () => {
    const base = await basePageSize(source, page)
    const canvas = await renderPreview(source, { ...page, id: key, sourceId: source.id, rotation: 0 }, SAMPLE_SCALE / PDF_CSS_SCALE)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Trình duyệt không cấp được canvas.')
    return { data: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, scale: canvas.width / base.width }
  })()
  entry.catch(() => pixels.delete(key))
  pixels.set(key, entry)
  while (pixels.size > KEEP) pixels.delete(pixels.keys().next().value as string)
  return entry
}

export function clearTextStyles(): void {
  pixels.clear()
}

function toPixels(area: Rect, scale: number) {
  return { x: area.x * scale, y: area.y * scale, width: area.width * scale, height: area.height * scale }
}

/** Tên phông nhúng — pdf.js chỉ có sau khi đã vẽ trang (lúc lấy mẫu màu). Lỗi thì trả rỗng, đoán theo họ phông. */
async function embeddedFontName(source: SourceFile, pageIndex: number, fontName: string): Promise<{ name: string; bold: boolean; italic: boolean }> {
  const none = { name: '', bold: false, italic: false }
  if (source.kind !== 'pdf') return none
  try {
    const page = await (await openPdf(source)).getPage(pageIndex + 1)
    if (!page.commonObjs.has(fontName)) return none
    const font = page.commonObjs.get(fontName) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean } | null
    return { name: font?.name ?? '', bold: Boolean(font?.bold || font?.black), italic: Boolean(font?.italic) }
  } catch {
    return none
  }
}

/** Màu chữ, màu nền, kiểu phông của chữ gốc trong `area` (pt, khung gốc). */
export async function inspectText(source: SourceFile, page: SampledPage, area: Rect, run: TextRun | null): Promise<TextLook> {
  const pixels = await pagePixels(source, page)
  const { fill, ink } = sampleColors(pixels.data, pixels.width, toPixels(area, pixels.scale))
  const embedded = run ? await embeddedFontName(source, page.pageIndex, run.fontName) : null
  const guessed = guessFontStyle(embedded?.name ?? '', run?.fontFamily ?? '')
  return {
    font: { serif: guessed.serif, bold: guessed.bold || Boolean(embedded?.bold), italic: guessed.italic || Boolean(embedded?.italic), match: true },
    sourceFont: embedded?.name || undefined,
    ink: ink ?? darkOn(fill),
    fill,
  }
}

/**
 * Các mảnh chữ có cùng một kiểu đậm / nghiêng không. Chữ sửa lại chỉ mang MỘT kiểu phông — sửa cả đoạn có vài từ in
 * đậm là mất chỗ đậm ấy. So tên phông thì không được: Word ghi chữ Latin và chữ có dấu của cùng một dòng bằng hai phông.
 */
export async function sameFace(source: SourceFile, page: SampledPage, runs: TextRun[]): Promise<boolean> {
  // pdf.js chỉ biết tên phông nhúng sau khi đã vẽ trang.
  await pagePixels(source, page)
  const faces = new Set<string>()
  for (const fontName of new Set(runs.filter((run) => run.text.trim()).map((run) => run.fontName))) {
    const embedded = await embeddedFontName(source, page.pageIndex, fontName)
    const guessed = guessFontStyle(embedded.name)
    faces.add(`${guessed.bold || embedded.bold}/${guessed.italic || embedded.italic}`)
  }
  return faces.size <= 1
}

/** Màu nền dưới vùng che. */
export async function sampleFill(source: SourceFile, page: SampledPage, area: Rect): Promise<Rgb> {
  const pixels = await pagePixels(source, page)
  return sampleColors(pixels.data, pixels.width, toPixels(area, pixels.scale)).fill
}

function darkOn([r, g, b]: Rgb): Rgb {
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.5 ? [0, 0, 0] : [1, 1, 1]
}
