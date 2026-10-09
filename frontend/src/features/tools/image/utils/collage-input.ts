import type { NumberRule } from '@/features/tools/hub/utils/number-input'

export const COLLAGE_MIN_FILES = 2
export const COLLAGE_MAX_FILES = 9
export const COLLAGE_GAP_RULE: NumberRule = { kind: 'integer', min: 0, max: 100 }

export type CollageFileProblem = 'none' | 'tooFew' | 'tooMany'

/** Lỗi của ô chọn ảnh; chưa chọn gì thì không coi là lỗi (chưa bắt đầu). */
export function collageFileProblem(count: number): CollageFileProblem | null {
  if (count === 0) return 'none'
  if (count < COLLAGE_MIN_FILES) return 'tooFew'
  if (count > COLLAGE_MAX_FILES) return 'tooMany'
  return null
}

export type CollageBlock = CollageFileProblem | 'gap'

/**
 * Vì sao nút ghép đang tắt — một lý do, theo thứ tự ô trên màn hình, để câu
 * nhắc chỉ đúng ô cần sửa. `gap` là số đã đọc theo `COLLAGE_GAP_RULE` (`null` = trống / sai).
 */
export function collageBlock(count: number, gap: number | null): CollageBlock | null {
  return collageFileProblem(count) ?? (gap === null ? 'gap' : null)
}
