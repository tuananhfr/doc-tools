import { translate } from '@/i18n/runtime'
import { parsePageRanges } from './page-ops'

export type SplitMode = 'ranges' | 'every'

export interface SplitInput {
  mode: SplitMode
  /** "1-3, 5, 8-10" — dùng khi `mode = ranges`. */
  ranges: string
  /** Số trang mỗi tệp — dùng khi `mode = every`. */
  every: number
}

export type SplitPlan = { ok: true; groups: number[][] } | { ok: false; message: string }

/** Nhãn một nhóm trang liền nhau (vị trí đếm từ 0): "4" hoặc "1-3". */
export function rangeLabel(indices: number[]): string {
  const first = indices[0] + 1
  const last = indices[indices.length - 1] + 1
  return first === last ? String(first) : `${first}-${last}`
}

/** Cắt `pageCount` trang thành các nhóm `size` trang liền nhau; nhóm cuối có thể ít hơn. */
export function chunkPages(pageCount: number, size: number): number[][] {
  const groups: number[][] = []
  for (let start = 0; start < pageCount; start += size) {
    groups.push(Array.from({ length: Math.min(size, pageCount - start) }, (_, offset) => start + offset))
  }
  return groups
}

/** Các nhóm trang sẽ thành tệp riêng, hoặc lý do chưa tách được. */
export function planSplit(input: SplitInput, pageCount: number): SplitPlan {
  if (pageCount < 2) return { ok: false, message: translate('pdf:splitPlan.onePage') }
  if (input.mode === 'ranges') {
    if (input.ranges.trim() === '') return { ok: false, message: translate('pdf:splitPlan.enterRanges') }
    return parsePageRanges(input.ranges, pageCount)
  }
  if (!Number.isInteger(input.every) || input.every < 1) return { ok: false, message: translate('pdf:splitPlan.everyInvalid') }
  // Bằng hoặc hơn số trang là ra đúng một tệp y như tệp gốc — người dùng tưởng đã tách.
  if (input.every >= pageCount) return { ok: false, message: translate('pdf:splitPlan.everyTooBig', { count: pageCount }) }
  return { ok: true, groups: chunkPages(pageCount, input.every) }
}
