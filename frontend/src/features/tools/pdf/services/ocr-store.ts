import type { PageRef } from '../types/doc-tools.types'
import type { PageText } from '../types/text-layer.types'
import { sheetKey } from '../utils/image-sheet'

/**
 * Lớp chữ do OCR đọc ra, sống trong RAM như mọi thứ khác của phiên. Khoá gồm
 * cả khổ giấy trang ảnh: đổi khổ là ảnh dời chỗ trên tờ, toạ độ chữ cũ lệch —
 * thà mất kết quả (nhận dạng lại) còn hơn tô / sửa chữ trật chỗ.
 */

type OcrPage = Pick<PageRef, 'pageIndex' | 'sheet'>

const texts = new Map<string, PageText>()
const listeners = new Set<() => void>()
let version = 0

const keyOf = (sourceId: string, page: OcrPage) => `${sourceId}:${page.pageIndex}:${sheetKey(page.sheet)}`

function notify() {
  version++
  for (const listener of listeners) listener()
}

export function ocrText(sourceId: string, page: OcrPage): PageText | undefined {
  return texts.get(keyOf(sourceId, page))
}

export function saveOcrText(sourceId: string, page: OcrPage, text: PageText): void {
  texts.set(keyOf(sourceId, page), text)
  notify()
}

/** Tệp nguồn mới dựng từ tệp cũ cùng số trang (điền form): lớp chữ OCR vẫn khớp từng trang. */
export function copyOcrTexts(fromId: string, toId: string): void {
  let copied = false
  for (const [key, text] of [...texts]) {
    if (!key.startsWith(`${fromId}:`)) continue
    texts.set(`${toId}${key.slice(fromId.length)}`, text)
    copied = true
  }
  if (copied) notify()
}

export function clearOcrTexts(): void {
  if (texts.size === 0) return
  texts.clear()
  notify()
}

/** Cho `useSyncExternalStore` — lớp chữ đổi thì kết quả tìm, lớp chữ của trang đang xem phải đọc lại. */
export function subscribeOcr(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function ocrVersion(): number {
  return version
}
