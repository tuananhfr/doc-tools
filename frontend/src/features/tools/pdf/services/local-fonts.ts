import { faceStyle, fontFamilyKey, type FontStyle } from '../utils/font-style'
import { readSfnt, type SfntInfo } from '../utils/sfnt'
import { localFontFamily } from './text-measure'

/** Một mặt phông cài trên máy — Local Font Access API (Chrome / Edge máy tính). */
interface LocalFontData {
  postscriptName: string
  family: string
  style: string
  blob: () => Promise<Blob>
}

interface LoadedFont extends SfntInfo {
  bytes: ArrayBuffer
}

type FontWindow = Window & { queryLocalFonts?: () => Promise<LocalFontData[]> }

const loaded = new Map<string, LoadedFont>()
const loading = new Map<string, Promise<string | null>>()
let catalog: Promise<LocalFontData[]> | null = null

/**
 * Danh sách phông trên máy. Lần đầu trình duyệt HỎI QUYỀN và đòi đang trong
 * thao tác của người dùng — phải gọi ngay đầu trình xử lý bấm chuột, trước mọi
 * `await`. Bị từ chối / trình duyệt không hỗ trợ → rỗng, lần bấm sau thử lại.
 */
export function requestLocalFonts(): Promise<LocalFontData[]> {
  const query = (window as FontWindow).queryLocalFonts
  if (!query) return Promise.resolve([])
  if (!catalog) {
    const pending = query.call(window).catch(() => {
      if (catalog === pending) catalog = null
      return [] as LocalFontData[]
    })
    catalog = pending
  }
  return catalog
}

async function loadFace(face: LocalFontData): Promise<string | null> {
  const bytes = await (await face.blob()).arrayBuffer()
  const info = readSfnt(bytes)
  if (!info?.embeddable) return null
  const font = new FontFace(localFontFamily(face.postscriptName), bytes)
  await font.load()
  document.fonts.add(font)
  loaded.set(face.postscriptName, { ...info, bytes })
  return face.postscriptName
}

/**
 * Tìm trên máy đúng phông của chữ gốc (theo tên phông trong PDF + đậm/nghiêng)
 * và nạp sẵn để đo, gõ, nhúng. Trả tên PostScript, hoặc null khi máy không có
 * / phông cấm nhúng — nơi gọi dùng phông đóng sẵn cùng bề rộng.
 */
export async function resolveLocalFont(pdfFontName: string, style: FontStyle): Promise<string | null> {
  const family = fontFamilyKey(pdfFontName)
  if (!family) return null
  const face = (await requestLocalFonts()).find((item) => {
    const look = faceStyle(item.style)
    return fontFamilyKey(item.family) === family && look.bold === style.bold && look.italic === style.italic
  })
  if (!face) return null
  if (loaded.has(face.postscriptName)) return face.postscriptName
  let pending = loading.get(face.postscriptName)
  if (!pending) {
    pending = loadFace(face).catch(() => null)
    loading.set(face.postscriptName, pending)
  }
  return pending
}

// Đã cấp quyền thì phông có ngay; hộp hỏi quyền còn mở thì không bắt người dùng chờ.
const WAIT_MS = 400

/** Như `resolveLocalFont` nhưng không chờ lâu — chưa có thì chữ vẫn sửa được ngay bằng phông đóng sẵn. */
export function resolveLocalFontSoon(pdfFontName: string | undefined, style: FontStyle): Promise<string | null> {
  if (!pdfFontName) return Promise.resolve(null)
  return Promise.race([resolveLocalFont(pdfFontName, style), new Promise<null>((resolve) => setTimeout(() => resolve(null), WAIT_MS))])
}

export function localFont(postscriptName: string): LoadedFont | undefined {
  return loaded.get(postscriptName)
}
