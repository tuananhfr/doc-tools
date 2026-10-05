import type { PageRef } from '../types/doc-tools.types'
import type { ScanFindings } from './scan-analysis'

export interface PageScan extends ScanFindings {
  /** Chỉnh nghiêng được: trang PDF hoặc ảnh đơn, chưa có lớp chữ, chưa đánh dấu (xoay là lệch dấu). */
  canDeskew: boolean
  /** Cắt viền được: trang PDF hoặc ảnh đơn, chưa có lớp chữ. */
  canCrop: boolean
}

export interface ScanFix {
  skew: number | null
  crop: boolean
}

export type ScanChoice = 'blank' | 'skew' | 'crop'

export interface ScanItem {
  page: PageRef
  /** Số thứ tự trang trong tài liệu (từ 1) lúc soi. */
  position: number
  scan: PageScan
}

export interface ScanGroups {
  blank: ScanItem[]
  skew: ScanItem[]
  crop: ScanItem[]
  /** Trang đã có lớp chữ / trang gộp ảnh: không soi nghiêng, viền. */
  skipped: number
}

export const choiceKey = (id: string, choice: ScanChoice) => `${id}:${choice}`

/** Trang trắng chỉ có một việc là bỏ — không gợi ý chỉnh nghiêng / cắt viền cho nó nữa. */
export function groupScan(items: ScanItem[], analyzed: number): ScanGroups {
  return {
    blank: items.filter((item) => item.scan.blank),
    skew: items.filter((item) => !item.scan.blank && item.scan.canDeskew && item.scan.skew !== null),
    crop: items.filter((item) => !item.scan.blank && item.scan.canCrop && item.scan.paper !== null),
    skipped: analyzed - items.filter((item) => item.scan.canCrop).length,
  }
}

export function allChoices(groups: ScanGroups): Set<string> {
  return new Set([
    ...groups.blank.map((item) => choiceKey(item.page.id, 'blank')),
    ...groups.skew.map((item) => choiceKey(item.page.id, 'skew')),
    ...groups.crop.map((item) => choiceKey(item.page.id, 'crop')),
  ])
}

/** Việc sẽ làm theo lựa chọn: trang bỏ + sửa gì ở mỗi trang (chỉnh nghiêng và cắt viền gộp một lượt). */
export function scanPlan(groups: ScanGroups, chosen: ReadonlySet<string>): { remove: string[]; fixes: Map<string, ScanFix> } {
  const remove = groups.blank.filter((item) => chosen.has(choiceKey(item.page.id, 'blank'))).map((item) => item.page.id)
  const fixes = new Map<string, ScanFix>()
  for (const item of [...groups.skew, ...groups.crop]) {
    const id = item.page.id
    const skew = chosen.has(choiceKey(id, 'skew')) ? item.scan.skew : null
    const crop = chosen.has(choiceKey(id, 'crop'))
    if (skew !== null || crop) fixes.set(id, { skew, crop })
  }
  return { remove, fixes }
}
