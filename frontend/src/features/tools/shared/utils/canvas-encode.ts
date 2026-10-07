import { translate } from '@/i18n/runtime'

export type CanvasMime = 'image/jpeg' | 'image/png' | 'image/webp'

/** Chất lượng khi công cụ không cho chọn: đủ cao để lần lưu lại không thấy vỡ nét. */
export const KEEP_QUALITY = 0.92

/**
 * `too-large`: canvas vượt trần của trình duyệt (iOS: ~16,7 triệu điểm ảnh).
 * `unsupported`: trình duyệt không ghi được định dạng xin (Safari với WebP).
 */
export class CanvasEncodeError extends Error {
  readonly reason: 'too-large' | 'unsupported'

  constructor(reason: 'too-large' | 'unsupported') {
    super(reason === 'too-large' ? translate('common:canvas.tooLarge') : translate('common:canvas.unsupported'))
    this.name = 'CanvasEncodeError'
    this.reason = reason
  }
}

/**
 * `canvas.toBlob` bọc thành Promise và bắt hai lỗi CÂM của nó: canvas quá lớn
 * cho ra `null` chứ không ném lỗi, và định dạng không ghi được thì lặng lẽ trả
 * về PNG. `quality` chỉ có nghĩa với JPG và WebP.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, mime: CanvasMime, quality = KEEP_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new CanvasEncodeError('too-large'))
        else if (blob.type !== mime) reject(new CanvasEncodeError('unsupported'))
        else resolve(blob)
      },
      mime,
      mime === 'image/png' ? undefined : quality,
    )
  })
}
