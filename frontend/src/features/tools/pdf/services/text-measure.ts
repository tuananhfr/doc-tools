import type { FontStyle } from '../utils/font-style'
import type { MeasureText } from '../utils/markup-geometry'

/** Trùng tên `@font-face` trong doc-tools.css — cùng tệp TTF nhúng vào PDF lúc xuất. */
const FAMILY = 'DocTools Stamp'
const SERIF_FAMILY = 'DocTools Serif'
const MATCH_FAMILY = 'DocTools Match'
const MATCH_SERIF_FAMILY = 'DocTools Match Serif'

/** Tên họ CSS của một phông trên máy đã nạp — mỗi mặt phông một họ riêng, khỏi để trình duyệt tự làm đậm/nghiêng giả. */
export function localFontFamily(postscriptName: string): string {
  return `DocTools Local ${postscriptName}`
}

export function cssFamily(font: FontStyle): string {
  if (font.local) return localFontFamily(font.local)
  if (font.match) return font.serif ? MATCH_SERIF_FAMILY : MATCH_FAMILY
  return font.serif ? SERIF_FAMILY : FAMILY
}

export function cssFont(font: FontStyle, size: number): string {
  // Mặt phông trên máy đã đậm/nghiêng sẵn trong tệp: xin thêm là trình duyệt bôi đậm lần hai.
  const face = font.local ? '400' : `${font.italic ? 'italic ' : ''}${font.bold ? 700 : 400}`
  return `${face} ${size}px "${cssFamily(font)}"`
}

/** Tải một kiểu phông trước khi đo/vẽ chữ bằng nó — kiểu nghiêng/có chân chỉ tải khi có chữ sửa lại dùng tới. */
export function loadFontFace(font: FontStyle): Promise<void> {
  return document.fonts
    .load(cssFont(font, 16))
    .then(() => undefined)
    .catch(() => undefined)
}

let ready: Promise<MeasureText> | null = null

/**
 * Đo chữ bằng canvas với ĐÚNG phông nhúng khi xuất, để khung chữ/ghi chú/con
 * dấu trên màn hình khớp bề rộng trong tệp PDF. Phải chờ phông tải xong: đo
 * sớm là canvas dùng phông dự phòng, khung hẹp/rộng hơn chữ thật.
 */
export function loadTextMeasure(): Promise<MeasureText> {
  ready ??= Promise.all([document.fonts.load(`400 16px "${FAMILY}"`), document.fonts.load(`700 16px "${FAMILY}"`)])
    .catch(() => undefined)
    .then(() => {
      const context = document.createElement('canvas').getContext('2d')
      return (text: string, size: number, bold: boolean, font?: FontStyle) => {
        if (!context) return text.length * size * 0.55
        context.font = cssFont(font ?? { serif: false, bold, italic: false }, size)
        return context.measureText(text).width
      }
    })
  return ready
}
