/**
 * Nén khi xuất PDF — chỉ nén lại ẢNH JPEG (DCT) trong tệp: đó là thứ chiếm
 * dung lượng ở hồ sơ scan và ảnh chụp hiện trường. Ảnh nén Flate (PNG, ảnh
 * chữ trắng đen) giữ nguyên: nén lại thành JPEG là nhoè chữ, còn nén lại
 * Flate thì gần như không nhỏ đi.
 */

export const COMPRESSION = {
  none: 'none',
  medium: 'medium',
  strong: 'strong',
} as const

export type Compression = (typeof COMPRESSION)[keyof typeof COMPRESSION]

export interface CompressionProfile {
  /** Chất lượng JPEG 0–1. */
  quality: number
  /** Cạnh dài tối đa (điểm ảnh) — 2480 ≈ A4 ở 300 DPI, 1600 ≈ A4 ở 190 DPI. */
  maxSide: number
}

export const COMPRESSION_PROFILE: Record<Exclude<Compression, 'none'>, CompressionProfile> = {
  medium: { quality: 0.75, maxSide: 2480 },
  strong: { quality: 0.55, maxSide: 1600 },
}

/** Ảnh nhỏ hơn thế này nén lại không đáng — logo, chữ ký, biểu tượng. */
export const MIN_IMAGE_BYTES = 20_000

/** Bản nén lại phải nhỏ hơn bản cũ ít nhất chừng này mới thay. */
export const MIN_SAVING = 0.1

export function scaledSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Thông tin một ảnh trong PDF đủ để quyết có nén lại được không. */
export interface ImageInfo {
  filters: string[]
  colorSpace: string | null
  /** Số kênh của ICCBased (`/N`), nếu có. */
  iccChannels?: number
  bitsPerComponent: number | null
  imageMask: boolean
  hasMask: boolean
  hasDecode: boolean
  bytes: number
}

export type ImageVerdict = 'recompress' | 'flate' | 'skip'

/**
 * Ảnh JPEG RGB/xám 8 bit, không mặt nạ, không mảng Decode mới nén lại: CMYK
 * nén lại qua canvas là đảo màu (JPEG Adobe lưu CMYK ngược), mặt nạ theo màu
 * (`/Mask` mảng) cần đúng từng giá trị điểm ảnh — JPEG làm lệch là thủng ảnh.
 */
export function classifyImage(info: ImageInfo): ImageVerdict {
  if (info.filters.length === 1 && info.filters[0] === 'FlateDecode') return 'flate'
  if (info.filters.length !== 1 || info.filters[0] !== 'DCTDecode') return 'skip'
  if (info.imageMask || info.hasMask || info.hasDecode || info.bitsPerComponent !== 8) return 'skip'
  if (info.bytes < MIN_IMAGE_BYTES) return 'skip'
  const rgbOrGray = info.colorSpace === 'DeviceRGB' || info.colorSpace === 'DeviceGray'
  const iccOk = info.colorSpace === 'ICCBased' && (info.iccChannels === 3 || info.iccChannels === 1)
  return rgbOrGray || iccOk ? 'recompress' : 'skip'
}

export interface CompressionStats {
  recompressed: number
  /** Ảnh Flate giữ nguyên — báo ra để người dùng hiểu vì sao tệp chưa nhỏ hơn. */
  flate: number
  savedBytes: number
}

export const NO_COMPRESSION_STATS: CompressionStats = { recompressed: 0, flate: 0, savedBytes: 0 }

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`
}

/** "nhỏ hơn 42%" / "lớn hơn 8%" / "" khi gần như không đổi. */
export function sizeChange(before: number, after: number): string {
  if (before <= 0) return ''
  const percent = Math.round((1 - after / before) * 100)
  if (percent >= 1) return `nhỏ hơn ${percent}%`
  if (percent <= -1) return `lớn hơn ${-percent}%`
  return ''
}

export function addStats(a: CompressionStats, b: CompressionStats): CompressionStats {
  return { recompressed: a.recompressed + b.recompressed, flate: a.flate + b.flate, savedBytes: a.savedBytes + b.savedBytes }
}

/**
 * Báo kết quả nén. So với CHÍNH tệp đó khi không nén (không so với tệp gốc):
 * xuất 2 trang của tệp 50 MB thì so với tệp gốc lúc nào cũng "nhỏ hơn 90%".
 */
export function compressionSummary(stats: CompressionStats, finalBytes: number): { tone: 'success' | 'info'; text: string } {
  const kept = stats.flate ? ` Giữ nguyên ${stats.flate} ảnh PNG / trắng đen để chữ không bị nhoè.` : ''
  if (stats.recompressed === 0) {
    return { tone: 'info', text: `Không nén thêm được: tệp không có ảnh JPEG đủ lớn để nén lại.${kept}` }
  }
  const before = finalBytes + stats.savedBytes
  const change = sizeChange(before, finalBytes)
  return {
    tone: 'success',
    text: `Đã nén ${stats.recompressed} ảnh: ${formatBytes(before)} → ${formatBytes(finalBytes)}${change ? ` (${change})` : ''}.${kept}`,
  }
}
