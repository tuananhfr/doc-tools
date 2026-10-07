import type { PDFDocument, PDFFont, PDFImage } from 'pdf-lib'
import { canvasToBlob } from '@/features/tools/shared'
import { activeLanguage } from '@/i18n/runtime'
import type { Rgb } from '../utils/decorations'
import type { FontStyle } from '../utils/font-style'
import { cjkOrder, isCjk, isRtl, needsRaster, splitByCoverage } from '../utils/text-script'
import type { CjkFontKey, FontLoader } from './pdf-fonts'

export type TextPiece =
  | { kind: 'glyphs'; text: string; font: PDFFont; width: number }
  | { kind: 'image'; image: PDFImage; width: number; ascent: number; descent: number }

/** Một dòng chữ đã chọn xong phông: các khúc vẽ nối tiếp trên cùng đường chân chữ. */
export interface PreparedText {
  pieces: TextPiece[]
  width: number
}

export type TextPreparer = (text: string, style: FontStyle, size: number, color: Rgb) => Promise<PreparedText>

/** Ảnh vẽ to hơn cỡ chữ ngần này lần (~290 dpi) — in ra giấy vẫn nét. */
const RASTER_SCALE = 4
const MAX_RASTER_EDGE = 8192

const charSets = new WeakMap<PDFFont, Set<number>>()
function covers(font: PDFFont, char: string): boolean {
  let set = charSets.get(font)
  if (!set) {
    set = new Set(font.getCharacterSet())
    charSets.set(font, set)
  }
  return set.has(char.codePointAt(0) ?? -1)
}

/**
 * Bộ chọn phông cho MỘT tài liệu. Phông chính vẽ được hết thì dùng nó; thiếu glyph Hán /
 * kana / Hangul thì ghép thêm đúng MỘT phông CJK phủ đủ; còn lại (Ả Rập, Thái, Khmer, Lào,
 * Myanmar, chữ hiếm ngoài bộ đã cắt, emoji) vẽ cả dòng bằng canvas rồi nhúng PNG trong suốt.
 * Ảnh thì không chọn / tìm được chữ — đổi lại đúng nét và đúng thứ tự hiển thị.
 */
export function createTextPreparer(doc: PDFDocument, fonts: FontLoader): TextPreparer {
  const rasters = new Map<string, Promise<PreparedText>>()

  const raster = (text: string, style: FontStyle, size: number, color: Rgb) => {
    const key = JSON.stringify([text, style.bold, style.italic, style.serif, size, color])
    let prepared = rasters.get(key)
    if (!prepared) {
      prepared = rasterize(doc, text, style, size, color)
      rasters.set(key, prepared)
    }
    return prepared
  }

  return async (text, style, size, color) => {
    if (needsRaster(text)) return raster(text, style, size, color)
    const base = await fonts(style)
    const slices = splitByCoverage(text, (char) => covers(base, char))
    const missing = slices.filter((slice) => !slice.base).map((slice) => slice.text).join('')
    let extra: PDFFont | null = null
    if (missing) {
      // Ký tự thiếu không phải CJK thì không phông nào đóng sẵn vẽ được — khỏi tải vài MB phông vô ích.
      if (![...missing].every(isCjk)) return raster(text, style, size, color)
      for (const family of cjkOrder(text, activeLanguage())) {
        const font = await fonts(`cjk${family}${style.bold ? 'Bold' : ''}` as CjkFontKey)
        if ([...missing].every((char) => covers(font, char))) {
          extra = font
          break
        }
      }
      if (!extra) return raster(text, style, size, color)
    }
    const pieces: TextPiece[] = slices.map((slice) => {
      const font = slice.base ? base : (extra as PDFFont)
      return { kind: 'glyphs', text: slice.text, font, width: font.widthOfTextAtSize(slice.text, size) }
    })
    return { pieces, width: pieces.reduce((sum, piece) => sum + piece.width, 0) }
  }
}

async function rasterize(doc: PDFDocument, text: string, style: FontStyle, size: number, color: Rgb): Promise<PreparedText> {
  const canvas = document.createElement('canvas')
  const font = `${style.italic ? 'italic ' : ''}${style.bold ? 700 : 400} ${size * RASTER_SCALE}px ${style.serif ? 'serif' : 'sans-serif'}`
  let context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2d')
  context.font = font
  const metrics = context.measureText(text)
  const ascent = metrics.fontBoundingBoxAscent || size * RASTER_SCALE * 0.95
  const descent = metrics.fontBoundingBoxDescent || size * RASTER_SCALE * 0.3
  // Dòng quá dài thì hạ độ phân giải thay vì vượt trần canvas (ảnh hỏng, toBlob trả null).
  const shrink = Math.min(1, MAX_RASTER_EDGE / Math.max(metrics.width, ascent + descent, 1))
  canvas.width = Math.max(1, Math.ceil(metrics.width * shrink))
  canvas.height = Math.max(1, Math.ceil((ascent + descent) * shrink))
  // Đổi kích thước canvas là mất hết trạng thái vẽ — đặt lại phông.
  context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.scale(shrink, shrink)
  context.font = font
  context.direction = isRtl(text) ? 'rtl' : 'ltr'
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = `rgb(${color.map((channel) => Math.round(channel * 255)).join(' ')})`
  context.fillText(text, 0, ascent)
  const blob = await canvasToBlob(canvas, 'image/png')
  const image = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
  const width = metrics.width / RASTER_SCALE
  return { pieces: [{ kind: 'image', image, width, ascent: ascent / RASTER_SCALE, descent: descent / RASTER_SCALE }], width }
}
