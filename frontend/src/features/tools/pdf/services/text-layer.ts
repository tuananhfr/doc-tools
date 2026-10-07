import { Util } from 'pdfjs-dist'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { PageText, TextRun } from '../types/text-layer.types'
import { proportionalMeasure, type RunMeasure } from '../utils/text-search'
import { clearOcrTexts, ocrText } from './ocr-store'
import { openPdf } from './pdf-render'

const cache = new Map<string, Promise<PageText>>()
const EMPTY: PageText = { runs: [] }

interface RawItem {
  str: string
  transform: number[]
  width: number
  fontName: string
  hasEOL: boolean
}

/**
 * Đọc lớp chữ một trang. `viewport.transform` ở tỉ lệ 1 đưa user space của PDF
 * về đúng khung gốc mà dấu đang dùng (đã áp CropBox + `/Rotate`) — tự ghép ma
 * trận là lệch ở trang có CropBox không bắt đầu từ 0,0.
 */
export function loadPageText(source: SourceFile, page: Pick<PageRef, 'pageIndex' | 'sheet'> & Partial<Pick<PageRef, 'rotation'>>): Promise<PageText> {
  // Chỉ trang không có lớp chữ mới được nhận dạng, nên có kết quả OCR là dùng luôn.
  const recognized = ocrText(source.id, page)
  if (recognized) return Promise.resolve(recognized)
  if (source.kind !== 'pdf') return Promise.resolve(EMPTY)
  const { pageIndex } = page
  const key = `${source.id}:${pageIndex}`
  let text = cache.get(key)
  if (!text) {
    text = (async () => {
      const page = await (await openPdf(source)).getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const runs: TextRun[] = []
      for (const item of content.items as RawItem[]) {
        if (!('str' in item)) continue
        // Mảnh rỗng mang dấu xuống dòng: dồn cờ vào mảnh trước, không giữ mảnh 0 ký tự.
        if (item.str.length === 0) {
          if (item.hasEOL && runs.length > 0) runs[runs.length - 1].eol = true
          continue
        }
        const [a, b, c, d, e, f] = Util.transform(viewport.transform, item.transform)
        const style = content.styles[item.fontName]
        const ascent = style?.ascent || 0.8
        const descent = Math.abs(style?.descent || -0.2)
        runs.push({
          text: item.str.normalize('NFC'),
          origin: { x: e, y: f },
          // Toạ độ màn hình y hướng xuống: góc ngược chiều kim đồng hồ là atan2(−b, a).
          angle: (Math.atan2(-b, a) * 180) / Math.PI,
          size: Math.hypot(c, d),
          width: item.width * viewport.scale,
          ascent,
          descent,
          fontName: item.fontName,
          fontFamily: style?.fontFamily ?? 'sans-serif',
          eol: item.hasEOL,
        })
      }
      page.cleanup()
      return { runs }
    })()
    text.catch(() => cache.delete(key))
    cache.set(key, text)
  }
  return text
}

export function clearTextLayer(): void {
  cache.clear()
  clearOcrTexts()
}

let context: CanvasRenderingContext2D | null | undefined

/** Chữ mới rộng gấp mấy lần chữ cũ, đo bằng họ phông pdf.js đoán cho mảnh đó — để cảnh báo thay vào bị tràn. */
export function textWidthRatio(run: TextRun, original: string, replacement: string): number {
  context ??= document.createElement('canvas').getContext('2d')
  if (!context) return replacement.length / Math.max(1, original.length)
  context.font = `16px ${run.fontFamily}`
  return context.measureText(replacement).width / Math.max(1, context.measureText(original).width)
}

/**
 * Đo vị trí ký tự trong mảnh bằng canvas với họ font pdf.js đoán, rồi co giãn
 * về bề dài thật của mảnh. Chia đều theo số ký tự thì khung tô lệch rõ ở chữ
 * có "i", "l" xen "m", "W".
 */
export const canvasRunMeasure: RunMeasure = (run, chars) => {
  if (chars <= 0 || run.text.length === 0) return 0
  if (chars >= run.text.length) return run.width
  context ??= document.createElement('canvas').getContext('2d')
  if (!context) return proportionalMeasure(run, chars)
  context.font = `16px ${run.fontFamily}`
  const whole = context.measureText(run.text).width
  return whole > 0 ? (run.width * context.measureText(run.text.slice(0, chars)).width) / whole : proportionalMeasure(run, chars)
}
