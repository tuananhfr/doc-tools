import type { PDFDocument, PDFFont } from 'pdf-lib'
import matchBoldUrl from '@/assets/fonts/Arimo-Bold.ttf?url'
import matchBoldItalicUrl from '@/assets/fonts/Arimo-BoldItalic.ttf?url'
import matchItalicUrl from '@/assets/fonts/Arimo-Italic.ttf?url'
import matchRegularUrl from '@/assets/fonts/Arimo-Regular.ttf?url'
import boldUrl from '@/assets/fonts/BeVietnamPro-Bold.ttf?url'
import boldItalicUrl from '@/assets/fonts/BeVietnamPro-BoldItalic.ttf?url'
import italicUrl from '@/assets/fonts/BeVietnamPro-Italic.ttf?url'
import regularUrl from '@/assets/fonts/BeVietnamPro-Regular.ttf?url'
import serifBoldUrl from '@/assets/fonts/NotoSerif-Bold.ttf?url'
import serifBoldItalicUrl from '@/assets/fonts/NotoSerif-BoldItalic.ttf?url'
import serifItalicUrl from '@/assets/fonts/NotoSerif-Italic.ttf?url'
import serifUrl from '@/assets/fonts/NotoSerif-Regular.ttf?url'
import matchSerifBoldUrl from '@/assets/fonts/Tinos-Bold.ttf?url'
import matchSerifBoldItalicUrl from '@/assets/fonts/Tinos-BoldItalic.ttf?url'
import matchSerifItalicUrl from '@/assets/fonts/Tinos-Italic.ttf?url'
import matchSerifUrl from '@/assets/fonts/Tinos-Regular.ttf?url'
import { fontKey, type FontKey, type FontStyle } from '../utils/font-style'
import { localFont } from './local-fonts'

/**
 * Phông chữ cho số trang / đầu-chân trang / watermark / chữ đánh dấu. 14 phông
 * chuẩn của PDF (Helvetica…) chỉ có bảng mã WinAnsi — "Trang" thì in được,
 * "Bản sao" thì pdf-lib ném lỗi ngay ở chữ "ả". Phải nhúng TTF đủ dấu tiếng Việt.
 *
 * Tệp TTF không nằm trong precache của service worker (Workbox chỉ lấy
 * woff/woff2) — xuất có chữ khi mất mạng lần đầu sẽ báo lỗi, không im lặng.
 * Nghiêng + Noto Serif chỉ dùng cho chữ sửa lại (đoán theo phông gốc); Noto
 * Serif đã cắt còn Latin + tiếng Việt (OFL cho phép) để mỗi tệp ~150 KB.
 *
 * Arimo / Tinos (khoá `match*`) là phông thay cho chữ SỬA LẠI: cùng bề rộng ký
 * tự với Arial / Times New Roman nên chữ mới chiếm đúng chỗ chữ cũ. Đã cắt còn
 * Latin + tiếng Việt + Hy Lạp + ký hiệu, bỏ kerning (Word không kern mặc định —
 * giữ kern là dòng gõ lại ngắn hơn dòng gốc).
 */
export const FONT_URLS: Record<FontKey, string> = {
  regular: regularUrl,
  bold: boldUrl,
  italic: italicUrl,
  boldItalic: boldItalicUrl,
  serif: serifUrl,
  serifBold: serifBoldUrl,
  serifItalic: serifItalicUrl,
  serifBoldItalic: serifBoldItalicUrl,
  matchRegular: matchRegularUrl,
  matchBold: matchBoldUrl,
  matchItalic: matchItalicUrl,
  matchBoldItalic: matchBoldItalicUrl,
  matchSerif: matchSerifUrl,
  matchSerifBold: matchSerifBoldUrl,
  matchSerifItalic: matchSerifItalicUrl,
  matchSerifBoldItalic: matchSerifBoldItalicUrl,
}

/** Nhận khoá phông đóng sẵn, hoặc kiểu phông của chữ sửa lại (có thể trỏ tới phông trên máy). */
export type FontLoader = (font: FontKey | FontStyle) => Promise<PDFFont>

const cache = new Map<FontKey, Promise<ArrayBuffer>>()

function fontBytes(key: FontKey): Promise<ArrayBuffer> {
  let bytes = cache.get(key)
  if (!bytes) {
    bytes = fetch(FONT_URLS[key]).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.arrayBuffer()
    })
    // Lỗi mạng thì bỏ khỏi cache để lần xuất sau thử tải lại.
    bytes.catch(() => cache.delete(key))
    cache.set(key, bytes)
  }
  return bytes
}

/**
 * Bộ nạp phông cho MỘT tài liệu đang dựng: mỗi độ đậm chỉ nhúng một lần dù số
 * trang lẫn chữ đánh dấu cùng dùng, và chỉ giữ glyph thực sự vẽ (subset).
 * `subset: false` khi người khác còn gõ tiếp bằng phông này (ô form chưa khoá):
 * bản cắt gọn thiếu glyph chữ họ sẽ gõ.
 */
export function createFontLoader(doc: PDFDocument, { subset = true }: { subset?: boolean } = {}): FontLoader {
  let registered: Promise<void> | null = null
  const fonts = new Map<string, Promise<PDFFont>>()
  const register = () => (registered ??= import('@pdf-lib/fontkit').then((fontkit) => doc.registerFontkit(fontkit.default)))

  const bundled = (key: FontKey) => {
    let font = fonts.get(key)
    if (!font) {
      font = Promise.all([register(), fontBytes(key)])
        .catch(() => {
          throw new Error('Không tải được phông chữ cho số trang / chữ đánh dấu. Kiểm tra kết nối mạng rồi thử lại.')
        })
        .then(([, bytes]) => doc.embedFont(bytes, { subset }))
      fonts.set(key, font)
    }
    return font
  }

  return (font) => {
    if (typeof font === 'string') return bundled(font)
    const local = font.local ? localFont(font.local) : undefined
    if (!local) return bundled(fontKey(font))
    const id = `local:${font.local}`
    let embedded = fonts.get(id)
    if (!embedded) {
      // Phông trên máy đủ kiểu (bảng lạ, tệp gộp…): nhúng không được thì dùng phông đóng sẵn cùng bề rộng, không bỏ dở lần xuất.
      embedded = register()
        .then(() => doc.embedFont(local.bytes, { subset }))
        .catch(() => bundled(fontKey(font)))
      fonts.set(id, embedded)
    }
    return embedded
  }
}
