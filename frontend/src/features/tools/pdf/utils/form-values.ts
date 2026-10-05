import type { PageRef } from '../types/doc-tools.types'
import type { FormField, FormValue, FormValues } from '../types/form.types'

export function sameValue(a: FormValue, b: FormValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    const sorted = [...b].sort()
    return [...a].sort().every((item, index) => item === sorted[index])
  }
  return a === b
}

/** Chỉ những trường người dùng đã đổi khác giá trị trong tệp — gõ rồi xoá về như cũ không tính. */
export function pendingChanges(fields: FormField[], draft: FormValues | undefined): FormValues {
  if (!draft) return {}
  const changes: FormValues = {}
  for (const field of fields) {
    if (field.readOnly || !(field.name in draft)) continue
    const value = draft[field.name]
    if (!sameValue(value, field.value)) changes[field.name] = value
  }
  return changes
}

export interface PlacedField {
  field: FormField
  /** Vị trí (đếm từ 1) của trang ĐẦU TIÊN trong tài liệu đang dựng có ô của trường. */
  position: number
}

/**
 * Trường của một tệp nguồn theo thứ tự trang hiện tại. Trường chỉ nằm ở trang
 * đã bỏ khỏi tài liệu thì ẩn — điền vào cũng không ra tệp xuất.
 */
export function placeFields(fields: FormField[], sourceId: string, pages: PageRef[]): { placed: PlacedField[]; hidden: number } {
  const firstPosition = new Map<number, number>()
  pages.forEach((page, index) => {
    if (page.sourceId === sourceId && !firstPosition.has(page.pageIndex)) firstPosition.set(page.pageIndex, index + 1)
  })
  const placed: PlacedField[] = []
  let hidden = 0
  for (const field of fields) {
    const positions = field.pages.map((pageIndex) => firstPosition.get(pageIndex)).filter((position): position is number => position !== undefined)
    if (positions.length === 0) hidden++
    else placed.push({ field, position: Math.min(...positions) })
  }
  // sort ổn định: cùng trang thì giữ thứ tự người soạn form khai.
  placed.sort((a, b) => a.position - b.position)
  return { placed, hidden }
}
