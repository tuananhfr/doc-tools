/** Kiểu phông của chữ sửa lại — chỉ ba trục đủ để chữ mới "trông giống" chữ cũ. */
export interface FontStyle {
  serif: boolean
  bold: boolean
  italic: boolean
  /**
   * Chữ sửa lại: dùng phông CÙNG BỀ RỘNG KÝ TỰ với Arial / Times New Roman
   * (Arimo / Tinos) thay cho phông con dấu — chữ mới chiếm đúng chỗ chữ cũ.
   */
  match?: boolean
  /** Tên PostScript của phông cài trên máy người dùng (đã nạp qua Local Font Access) — có thì dùng đúng phông gốc. */
  local?: string
}

const STAMP_KEYS = ['regular', 'bold', 'italic', 'boldItalic', 'serif', 'serifBold', 'serifItalic', 'serifBoldItalic'] as const
const MATCH_KEYS = ['matchRegular', 'matchBold', 'matchItalic', 'matchBoldItalic', 'matchSerif', 'matchSerifBold', 'matchSerifItalic', 'matchSerifBoldItalic'] as const

export const FONT_KEYS = [...STAMP_KEYS, ...MATCH_KEYS] as const

export type FontKey = (typeof FONT_KEYS)[number]

export const PLAIN_FONT: FontStyle = { serif: false, bold: false, italic: false }

/** Khoá tệp phông đóng sẵn — `local` không tính: phông trên máy không có tệp trong gói. */
export function fontKey({ serif, bold, italic, match }: FontStyle): FontKey {
  const index = (serif ? 4 : 0) + (italic ? 2 : 0) + (bold ? 1 : 0)
  return (match ? MATCH_KEYS : STAMP_KEYS)[index]
}

const BOLD = /bold|black|heavy|semibold|demi|[-,]bd\b|w[6-9]\b/i
const ITALIC = /italic|oblique|[-,]it\b|slanted/i
const SERIF = /times|serif|roman|georgia|garamond|cambria|palatino|minion|bookman|book ?antiqua|century|baskerville|caslon|didot|bodoni|tinos|liberation ?serif|cmr\d|nimbus ?rom|vni-times/i
const SANS = /sans|arial|helvetica|verdana|tahoma|calibri|segoe|roboto|inter\b|gothic|grotesk|frutiger|univers|futura/i

/**
 * Đoán kiểu phông từ tên phông nhúng trong PDF (bỏ tiền tố subset "ABCDEF+")
 * và họ phông chung pdf.js đoán được. Chỉ là đoán — phông gốc không được phép
 * trích ra dùng lại (và thường đã bị cắt chỉ còn glyph có trong trang).
 */
export function guessFontStyle(name: string, genericFamily = ''): FontStyle {
  const bare = name.replace(/^[A-Z]{6}\+/, '')
  return {
    // "Sans" thắng: "NotoSans" hay "PTSerifSans"… có chữ serif trong tên nhưng không có chân.
    serif: !SANS.test(bare) && (SERIF.test(bare) || genericFamily === 'serif'),
    bold: BOLD.test(bare),
    italic: ITALIC.test(bare),
  }
}

/**
 * Họ phông rút gọn để so tên phông trong PDF với phông cài trên máy:
 * "ABCDEF+TimesNewRomanPS-BoldMT", "TimesNewRoman,Bold", "Times New Roman" → "timesnewroman".
 */
export function fontFamilyKey(name: string): string {
  const [family] = name.replace(/^[A-Z]{6}\+/, '').split(/[-,]/)
  return family
    .replace(/(PSMT|PS|MT)$/, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

/** Kiểu của một mặt phông trên máy, đọc từ tên kiểu ("Bold Italic", "Regular"…). */
export function faceStyle(styleName: string): Pick<FontStyle, 'bold' | 'italic'> {
  return { bold: BOLD.test(styleName), italic: ITALIC.test(styleName) }
}
