import { stem, type CanvasMime } from '@/features/tools/shared'
import type { ImageFormat, Size } from '../types/image.types'
import { translate } from '@/i18n/runtime'

export const IMAGE_FORMAT: Record<ImageFormat, { mime: CanvasMime; extension: string; label: string }> = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg', label: 'JPG' },
  png: { mime: 'image/png', extension: 'png', label: 'PNG' },
  webp: { mime: 'image/webp', extension: 'webp', label: 'WebP' },
}

/** "IMG_0012.png" + webp + "đã nén" → "IMG_0012 - đã nén.webp". */
export function outputName(name: string, format: ImageFormat, suffix = ''): string {
  return `${stem(name) || translate('image:file.fallback')}${suffix ? ` - ${suffix}` : ''}.${IMAGE_FORMAT[format].extension}`
}

/** Thu nhỏ cho cạnh dài không vượt `maxEdge`, giữ tỉ lệ; không bao giờ phóng to. */
export function fitWithin(size: Size, maxEdge: number | null): Size {
  const longest = Math.max(size.width, size.height)
  if (!maxEdge || longest <= maxEdge) return { width: size.width, height: size.height }
  const ratio = maxEdge / longest
  return { width: Math.max(1, Math.round(size.width * ratio)), height: Math.max(1, Math.round(size.height * ratio)) }
}

/** "4032 × 3024 px" — không chấm phân cách nghìn: người dùng quen đọc kích thước ảnh liền số. */
export function sizeLabel(size: Size): string {
  return `${Math.round(size.width)} × ${Math.round(size.height)} px`
}
