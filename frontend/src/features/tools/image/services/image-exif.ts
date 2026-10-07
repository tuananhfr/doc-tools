import type { FlowNote } from '@/features/tools/hub'
import { attachJpegExif, attachPngExif, exifForRedraw, IMAGE_HEADER_BYTES, readJpegExif, readPngExif, readWebpExif } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import type { ImageFormat, ImageItem, Size } from '../types/image.types'

/** `none` = ảnh gốc không mang EXIF; `kept` / `lost` = có, và ảnh ra còn / không còn. */
export type ExifOutcome = 'none' | 'kept' | 'lost'

async function sourceExif(item: ImageItem): Promise<Uint8Array | null> {
  if (item.format === 'jpeg') return readJpegExif(new Uint8Array(await item.file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer()))
  // PNG / WebP để EXIF ở SAU dữ liệu ảnh: phải đọc cả tệp (đã qua trần 100 MB), đọc xong là nhả.
  const bytes = new Uint8Array(await item.file.arrayBuffer())
  return item.format === 'png' ? readPngExif(bytes) : readWebpExif(bytes)
}

/** Ảnh được trả lại NGUYÊN tệp gốc: EXIF có thì còn. */
export async function originalExif(item: ImageItem): Promise<ExifOutcome> {
  return (await sourceExif(item)) ? 'kept' : 'none'
}

/**
 * Gắn EXIF của ảnh gốc vào ảnh vừa vẽ lại qua canvas (canvas mã hoá ra ảnh trơn).
 * Ghi được vào JPG và PNG; ảnh ra WebP thì mất (ghi EXIF vào WebP là phải dựng
 * lại cả khung VP8X), và người gọi phải nói ra.
 */
export async function carryExif(item: ImageItem, blob: Blob, format: ImageFormat, size: Size): Promise<{ blob: Blob; exif: ExifOutcome }> {
  const exif = await sourceExif(item)
  if (!exif) return { blob, exif: 'none' }
  if (format === 'webp') return { blob, exif: 'lost' }
  const adjusted = exifForRedraw(exif, size)
  const attached = adjusted ? await (format === 'jpeg' ? attachJpegExif(blob, adjusted) : attachPngExif(blob, adjusted)) : null
  return attached ? { blob: attached, exif: 'kept' } : { blob, exif: 'lost' }
}

/**
 * Nói rõ ảnh ra còn hay mất ngày chụp + toạ độ, đếm theo TỪNG ảnh: một câu chung
 * cho cả lô từng nói "không còn GPS" trong khi nửa lô vẫn còn.
 */
export function exifNotes(outcomes: ExifOutcome[]): FlowNote[] {
  const kept = outcomes.filter((outcome) => outcome === 'kept').length
  const lost = outcomes.filter((outcome) => outcome === 'lost').length
  const one = outcomes.length === 1
  const total = outcomes.length
  const notes: FlowNote[] = []
  if (kept > 0) notes.push({ tone: 'info', text: one ? translate('image:exif.keptOne') : translate('image:exif.keptSome', { count: kept, total }) })
  if (lost > 0) notes.push({ tone: 'warning', text: one ? translate('image:exif.lostOne') : translate('image:exif.lostSome', { count: lost, total }) })
  return notes
}
