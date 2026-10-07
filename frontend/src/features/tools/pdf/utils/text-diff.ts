/**
 * So chữ hai tài liệu theo TỪNG DÒNG (spec — "So sánh tài liệu", bản Free: so
 * chữ xác định, không AI). Cùng hai tệp vào thì luôn ra cùng một kết quả.
 */

import { translate } from '@/i18n/runtime'

/** Một dòng chữ của tài liệu và trang chứa nó (đếm từ 1). */
export interface DocLine {
  text: string
  page: number
}

export interface CompareOptions {
  /** Coi "a  b" và "a b" là một — lớp chữ PDF hay khác nhau số dấu cách dù trang in ra y hệt. */
  ignoreSpace: boolean
  ignoreCase: boolean
}

export type Edit = { kind: 'same'; a: number; b: number } | { kind: 'remove'; a: number } | { kind: 'add'; b: number }

/**
 * Trần số dòng khác nhau thuật toán chịu tìm khớp tối ưu. Myers giữ một bản chụp
 * cho mỗi bước: 1500 bước ≈ 18 MB. Vượt trần là hai tài liệu gần như không liên
 * quan — khớp tối ưu lúc đó cũng chẳng giúp người đọc hơn "bỏ hết, thêm hết".
 */
export const MAX_DISTANCE = 1500

/** Myers O(ND) trên đoạn `a[a0, a0+n)` × `b[b0, b0+m)`. `null` = vượt `max` bước. */
function myers(a: string[], b: string[], a0: number, n: number, b0: number, m: number, max: number): Edit[] | null {
  const limit = Math.min(n + m, max)
  const offset = limit + 1
  const v = new Int32Array(2 * limit + 3)
  const trace: Int32Array[] = []
  const down = (k: number, d: number, at: Int32Array) => k === -d || (k !== d && at[offset + k - 1] < at[offset + k + 1])

  for (let d = 0; d <= limit; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x = down(k, d, v) ? v[offset + k + 1] : v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[a0 + x] === b[b0 + y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x < n || y < m) continue

      const edits: Edit[] = []
      for (let step = d; step >= 0; step--) {
        const at = trace[step]
        const key = x - y
        const from = down(key, step, at) ? key + 1 : key - 1
        const fromX = at[offset + from]
        const fromY = fromX - from
        while (x > fromX && y > fromY) {
          edits.push({ kind: 'same', a: a0 + x - 1, b: b0 + y - 1 })
          x--
          y--
        }
        if (step > 0) edits.push(x === fromX ? { kind: 'add', b: b0 + fromY } : { kind: 'remove', a: a0 + fromX })
        x = fromX
        y = fromY
      }
      return edits.reverse()
    }
  }
  return null
}

/**
 * Chuỗi sửa ngắn nhất biến `a` thành `b`. `exact = false`: hai bên khác nhau quá
 * `maxDistance` dòng nên phần giữa được báo là "bỏ hết rồi thêm hết".
 */
export function diffKeys(a: string[], b: string[], maxDistance = MAX_DISTANCE): { edits: Edit[]; exact: boolean } {
  // Hai bản của một hợp đồng giống nhau gần hết: cắt đầu và đuôi chung trước cho phần phải dò còn nhỏ.
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let endA = a.length
  let endB = b.length
  while (endA > head && endB > head && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  const edits: Edit[] = []
  for (let index = 0; index < head; index++) edits.push({ kind: 'same', a: index, b: index })
  const middle = myers(a, b, head, endA - head, head, endB - head, maxDistance)
  if (middle) edits.push(...middle)
  else {
    for (let index = head; index < endA; index++) edits.push({ kind: 'remove', a: index })
    for (let index = head; index < endB; index++) edits.push({ kind: 'add', b: index })
  }
  for (let index = 0; endA + index < a.length; index++) edits.push({ kind: 'same', a: endA + index, b: endB + index })
  return { edits, exact: middle !== null }
}

export function lineKey(text: string, options: CompareOptions): string {
  let key = text.normalize('NFC')
  if (options.ignoreSpace) key = key.replace(/\s+/g, ' ').trim()
  if (options.ignoreCase) key = key.toLocaleLowerCase('vi')
  return key
}

export interface HunkLine {
  kind: Edit['kind']
  text: string
}

/** Một cụm khác nhau kèm vài dòng giống nhau ở hai đầu để biết nó nằm ở đâu. */
export interface Hunk {
  /** Trang của chỗ khác đầu tiên trong từng bản; `null` = cụm không có dòng nào của bản đó. */
  oldPage: number | null
  newPage: number | null
  lines: HunkLine[]
}

export interface Comparison {
  hunks: Hunk[]
  added: number
  removed: number
  exact: boolean
}

/** So hai tài liệu; `context` = số dòng giống nhau giữ lại quanh mỗi chỗ khác. */
export function compareLines(before: DocLine[], after: DocLine[], options: CompareOptions, context = 2, maxDistance = MAX_DISTANCE): Comparison {
  const { edits, exact } = diffKeys(
    before.map((line) => lineKey(line.text, options)),
    after.map((line) => lineKey(line.text, options)),
    maxDistance,
  )

  const changed = edits.flatMap((edit, index) => (edit.kind === 'same' ? [] : [index]))
  const hunks: Hunk[] = []
  let cursor = 0
  while (cursor < changed.length) {
    // Hai chỗ khác cách nhau không quá 2 × context dòng thì chung một cụm — tách ra là lặp lại cùng mấy dòng đệm.
    let last = cursor
    while (last + 1 < changed.length && changed[last + 1] - changed[last] <= 2 * context + 1) last++
    const from = Math.max(0, changed[cursor] - context)
    const slice = edits.slice(from, Math.min(edits.length, changed[last] + context + 1))
    // Trang ghi ở đầu cụm là trang của chỗ KHÁC đầu tiên, không phải của dòng đệm phía trước (có thể còn ở trang trước).
    const lead = slice.slice(changed[cursor] - from)
    const firstOld = lead.find((edit) => edit.kind !== 'add') ?? slice.find((edit) => edit.kind !== 'add')
    const firstNew = lead.find((edit) => edit.kind !== 'remove') ?? slice.find((edit) => edit.kind !== 'remove')
    hunks.push({
      oldPage: firstOld && 'a' in firstOld ? before[firstOld.a].page : null,
      newPage: firstNew && 'b' in firstNew ? after[firstNew.b].page : null,
      // Dòng giống nhau lấy chữ của BẢN MỚI: hai bên chỉ khác khoảng trắng / hoa thường đã được bảo bỏ qua.
      lines: slice.map((edit) => ({ kind: edit.kind, text: edit.kind === 'remove' ? before[edit.a].text : after[edit.b].text })),
    })
    cursor = last + 1
  }

  return {
    hunks,
    added: edits.filter((edit) => edit.kind === 'add').length,
    removed: edits.filter((edit) => edit.kind === 'remove').length,
    exact,
  }
}

const MARK: Record<Edit['kind'], string> = { same: '  ', remove: '- ', add: '+ ' }

function hunkTitle(hunk: Hunk): string {
  if (hunk.oldPage === null) return translate('pdf:file.report.newPage', { page: hunk.newPage })
  if (hunk.newPage === null) return translate('pdf:file.report.oldPage', { page: hunk.oldPage })
  return translate('pdf:file.report.bothPages', { old: hunk.oldPage, new: hunk.newPage })
}

/** Báo cáo dạng chữ: "-" là dòng chỉ có ở bản cũ, "+" là dòng chỉ có ở bản mới. */
export function formatComparison(result: Comparison, names: { before: string; after: string }): string {
  const head = [
    translate('pdf:file.report.title'),
    translate('pdf:file.report.before', { name: names.before }),
    translate('pdf:file.report.after', { name: names.after }),
    result.hunks.length === 0
      ? translate('pdf:file.report.same')
      : translate('pdf:file.report.summary', { count: result.hunks.length, removed: result.removed, added: result.added }),
  ]
  const body = result.hunks.map((hunk, index) => [translate('pdf:file.report.hunk', { index: index + 1, where: hunkTitle(hunk) }), ...hunk.lines.map((line) => MARK[line.kind] + line.text)].join('\n'))
  return [head.join('\n'), ...body].join('\n\n')
}
