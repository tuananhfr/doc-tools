import type { InsertPosition, PageRef, Rotation } from '../types/doc-tools.types'
import type { Markup } from '../types/markup.types'

/**
 * Các phép biến đổi danh sách trang — hàm THUẦN, luôn trả mảng mới.
 *
 * Tách khỏi reducer để test được đúng các ca nghiệm thu của spec 09 ("chèn sau
 * trang 37 không lệch", "thay trang chỉ đổi trang đích"…) mà không cần DOM.
 */

function asSet(ids: Iterable<string>): Set<string> {
  return ids instanceof Set ? ids : new Set(ids)
}

export function rotatePages(pages: PageRef[], ids: Iterable<string>, delta: 90 | -90): PageRef[] {
  const target = asSet(ids)
  return pages.map((page) =>
    target.has(page.id)
      ? { ...page, rotation: ((((page.rotation + delta) % 360) + 360) % 360) as Rotation }
      : page,
  )
}

export function deletePages(pages: PageRef[], ids: Iterable<string>): PageRef[] {
  const target = asSet(ids)
  return pages.filter((page) => !target.has(page.id))
}

/** Bản sao đặt NGAY SAU trang gốc, mỗi bản sao một id mới. */
export function duplicatePages(
  pages: PageRef[],
  ids: Iterable<string>,
  makeId: () => string,
): PageRef[] {
  const target = asSet(ids)
  return pages.flatMap((page) => (target.has(page.id) ? [page, { ...page, id: makeId() }] : [page]))
}

/** `anchorId` null = thêm vào cuối. Anchor không còn tồn tại cũng rơi về cuối. */
export function insertPages(
  pages: PageRef[],
  added: PageRef[],
  anchorId: string | null,
  position: InsertPosition,
): PageRef[] {
  const index = anchorId === null ? -1 : pages.findIndex((page) => page.id === anchorId)
  if (index < 0) return [...pages, ...added]

  const at = position === 'before' ? index : index + 1
  return [...pages.slice(0, at), ...added, ...pages.slice(at)]
}

export function replacePage(pages: PageRef[], targetId: string, replacement: PageRef[]): PageRef[] {
  return pages.flatMap((page) => (page.id === targetId ? replacement : [page]))
}

/**
 * Đưa các trang `ids` về vị trí `targetIndex` (tính trên mảng CŨ, như chỗ con
 * trỏ thả xuống), giữ nguyên thứ tự tương đối giữa chúng.
 */
export function movePages(pages: PageRef[], ids: Iterable<string>, targetIndex: number): PageRef[] {
  const target = asSet(ids)
  const moving = pages.filter((page) => target.has(page.id))
  if (moving.length === 0) return pages

  // Số trang đang di chuyển nằm TRƯỚC điểm thả — rút chúng ra thì điểm thả lùi lại chừng đó.
  const shift = pages.slice(0, targetIndex).filter((page) => target.has(page.id)).length
  const rest = pages.filter((page) => !target.has(page.id))
  const at = Math.max(0, Math.min(rest.length, targetIndex - shift))
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)]
}

/** Dời một trang sang trái/phải một bậc (nút ←/→ — thay kéo thả trên điện thoại). */
export function shiftPage(pages: PageRef[], id: string, delta: -1 | 1): PageRef[] {
  const index = pages.findIndex((page) => page.id === id)
  const next = index + delta
  if (index < 0 || next < 0 || next >= pages.length) return pages

  const result = [...pages]
  ;[result[index], result[next]] = [result[next], result[index]]
  return result
}

export type RangeParseResult =
  | { ok: true; groups: number[][] }
  | { ok: false; message: string }

/**
 * Đọc chuỗi khoảng trang kiểu "1-3, 5, 8-10" → mỗi nhóm là một mảng chỉ số
 * (đếm từ 0). Mỗi nhóm cách nhau dấu phẩy/chấm phẩy = một tệp khi tách.
 *
 * Báo lỗi thay vì bỏ qua im lặng: tách thiếu trang mà người dùng không biết là
 * đúng lỗi "mất trang" spec 01 cấm.
 */
export function parsePageRanges(input: string, pageCount: number): RangeParseResult {
  const parts = input
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return { ok: false, message: 'Nhập khoảng trang, ví dụ 1-3, 5, 8-10.' }

  const groups: number[][] = []
  for (const part of parts) {
    const match = /^(\d+)\s*(?:[-–]\s*(\d+))?$/.exec(part)
    if (!match) return { ok: false, message: `Không đọc được "${part}".` }

    const start = Number(match[1])
    const end = match[2] === undefined ? start : Number(match[2])
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      return { ok: false, message: `"${part}" nằm ngoài 1–${pageCount}.` }
    }
    if (start > end) return { ok: false, message: `"${part}": trang đầu lớn hơn trang cuối.` }

    groups.push(Array.from({ length: end - start + 1 }, (_, offset) => start - 1 + offset))
  }

  return { ok: true, groups }
}

/** Thêm dấu vào nhiều trang cùng lúc (tìm & thay) — một lần sửa, một bước hoàn tác. */
export function appendPageMarkups(pages: PageRef[], additions: ReadonlyMap<string, Markup[]>): PageRef[] {
  if (additions.size === 0) return pages
  let changed = false
  const next = pages.map((page) => {
    const added = additions.get(page.id)
    if (!added?.length) return page
    changed = true
    return { ...page, markups: [...(page.markups ?? []), ...added] }
  })
  return changed ? next : pages
}

/** Thay danh sách đánh dấu của một trang; mảng rỗng thì bỏ hẳn khoá cho gọn. */
export function setPageMarkups(pages: PageRef[], id: string, markups: Markup[]): PageRef[] {
  const index = pages.findIndex((page) => page.id === id)
  if (index < 0 || pages[index].markups === markups) return pages
  const { markups: _previous, ...rest } = pages[index]
  const next = [...pages]
  next[index] = markups.length > 0 ? { ...rest, markups } : rest
  return next
}

/**
 * Gộp các trang `ids` (theo thứ tự trong tài liệu) thành từng nhóm `size`
 * trang; trang gộp đứng ở chỗ trang đầu nhóm. Nhóm lẻ cuối chỉ còn một trang
 * thì giữ nguyên — "gộp" một ảnh là đổi khổ ảnh mà người dùng không hỏi.
 */
export function combinePages(pages: PageRef[], ids: Iterable<string>, size: number, combined: (group: PageRef[]) => PageRef | null): PageRef[] {
  const target = asSet(ids)
  const chosen = pages.filter((page) => target.has(page.id))
  const replacement = new Map<string, PageRef | null>()
  for (let start = 0; start < chosen.length; start += size) {
    const group = chosen.slice(start, start + size)
    const merged = group.length < 2 ? null : combined(group)
    if (!merged) continue
    replacement.set(group[0].id, merged)
    for (const page of group.slice(1)) replacement.set(page.id, null)
  }
  if (replacement.size === 0) return pages
  return pages.flatMap((page) => {
    if (!replacement.has(page.id)) return [page]
    const next = replacement.get(page.id)
    return next ? [next] : []
  })
}
