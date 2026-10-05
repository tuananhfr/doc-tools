/**
 * Những phần của trang KHÔNG đi theo khi chỗ sửa đẩy phần dưới xuống: chân
 * trang (số trang, tên dự án) và cột chữ bên cạnh. Mọi toạ độ ở hệ của khối chữ
 * đang sửa — `u` dọc dòng, `v` xuống dưới.
 *
 * Cả hai đều là đoán từ hình học của chính trang ấy, và đoán sai theo hướng nào
 * cũng hỏng: coi bảng không viền là hai cột thì hàng bị xé đôi, coi dòng cuối
 * thân bài là chân trang thì chữ bị đẩy đè lên nó. Nên ngưỡng nào cũng chặt —
 * không chắc thì đẩy tất cả như trang một cột không có chân trang.
 */

/** Một đối tượng của trang trong hệ của khối chữ. */
export interface ZoneItem {
  text: boolean
  u0: number
  u1: number
  v0: number
  v1: number
  /** Chân chữ — chỉ đối tượng chữ có. */
  base?: number
}

export interface Extent {
  v0: number
  v1: number
}

const RULE_WIDTH = 3
/** Chân trang nằm trong ngần này phần đáy trang. */
const FOOTER_BAND = 0.15
/** Chân trang cách thân bài ít nhất ngần này lần giãn dòng — dòng cuối thân bài thì cách đúng một lần. */
const FOOTER_GAP = 1.2
/** Vật cao gần hết trang là nền / khung viền trang, không phải nội dung. */
const BACKDROP = 0.8

const visible = (item: ZoneItem) => item.u1 - item.u0 > 0.01 || item.v1 - item.v0 > 0.01
const content = (items: ZoneItem[], page: Extent) => items.filter((item) => visible(item) && item.v1 - item.v0 < (page.v1 - page.v0) * BACKDROP)
const baseOf = (item: ZoneItem) => item.base ?? item.v1

/**
 * Mép trên của vùng chân trang đứng yên, `null` khi trang không có chân trang rõ
 * ràng: cụm chữ thấp nhất nằm ở dải đáy trang và cách phần phía trên một khoảng
 * rộng hơn giãn dòng thường.
 */
export function footerTop(items: ZoneItem[], page: Extent, pitch: number): number | null {
  const shown = content(items, page)
  const band = page.v1 - (page.v1 - page.v0) * FOOTER_BAND
  const texts = shown.filter((item) => item.text).sort((a, b) => baseOf(b) - baseOf(a))
  if (texts.length === 0 || baseOf(texts[0]) < band) return null

  let top = Infinity
  let previous = baseOf(texts[0])
  const cluster = new Set<ZoneItem>()
  for (const text of texts) {
    const base = baseOf(text)
    if (base < band || previous - base > pitch * 1.5) break
    cluster.add(text)
    top = Math.min(top, text.v0)
    previous = base
  }
  // Nét kẻ ngang ngay trên chữ chân trang là của chân trang.
  for (const item of shown) {
    if (!item.text && item.v1 - item.v0 <= RULE_WIDTH && item.v0 < top && item.v0 >= top - pitch * 1.5 && item.v0 >= band) {
      cluster.add(item)
      top = item.v0
    }
  }

  const body = Math.max(page.v0, ...shown.filter((item) => !cluster.has(item) && item.v0 < top).map((item) => item.v1))
  return top - body >= pitch * FOOTER_GAP ? top : null
}

export interface BodyBounds {
  /** Lề trên: phần tràn sang trang mới được đặt từ đây. */
  head: number
  /** Mép dưới của thân bài: nội dung bị đẩy qua đây là tràn trang. */
  floor: number
}

const MIN_MARGIN = 18
const MAX_MARGIN = 0.15

/**
 * PDF không ghi lề nên suy từ nội dung: lề trên = mép trên của vật cao nhất, lề
 * dưới lấy bằng lề trên. Trang đã đầy quá mức ấy thì mép dưới là chỗ nội dung
 * đang chạm tới — thêm một dòng là tràn; và không bao giờ lấn vào chân trang.
 */
export function bodyBounds(items: ZoneItem[], page: Extent, footer: number | null, pitch: number): BodyBounds {
  const body = content(items, page).filter((item) => footer === null || item.v0 < footer - 0.5)
  const height = page.v1 - page.v0
  const top = Math.min(page.v1, ...body.map((item) => item.v0)) - page.v0
  const margin = Math.min(height * MAX_MARGIN, Math.max(MIN_MARGIN, top))
  const reach = Math.min(footer ?? page.v1, Math.max(page.v0, ...body.map((item) => item.v1)))
  const limit = Math.min(page.v1 - margin, footer === null ? Infinity : footer - pitch * 0.5)
  return { head: page.v0 + margin, floor: Math.max(limit, reach) }
}

/** Khối chữ đang sửa, đủ để tìm cột bên cạnh. */
export interface ColumnBlock {
  /** Mép trái / phải của chính chữ trong khối. */
  left: number
  right: number
  /** Mép trên của dòng đầu và chân chữ dòng cuối. */
  top: number
  last: number
  size: number
}

export interface SideColumns {
  /** Ranh giới với cột bên trái / phải, nằm giữa khe cột; `null` = phía ấy không có cột. */
  left: number | null
  right: number | null
  /** Mép phải của cột đang sửa khi bên phải còn cột — chữ mới không được chạy quá đây. */
  reach: number | null
  /** Mép dưới của vùng nhiều cột. */
  end: number
  /** Mép dưới hiện tại của cột đang sửa và của cột dài nhất trong các cột còn lại. */
  own: number
  other: number
}

const MIN_LINES = 6
/** Cột thấp hơn trong hai cột chưa cao tới ngần này phần trang thì phải qua thêm phép thử `startsAlign`. */
const MIN_SPAN = 0.4
/** Khoảng cách dòng lớn hơn ngần này lần khoảng nhỏ nhất của cột là chỗ sang đoạn mới. */
const PARAGRAPH_GAP = 1.2
/** Dòng "đầy": rộng ít nhất ngần này phần dòng rộng nhất của cột. */
const FULL_LINE = 0.75
/** Cột chữ thật thì rộng cỡ vài chục ký tự; cột số, cột ngày của bảng không viền hẹp hơn nhiều. */
const MIN_WIDTH = 12
/** Dòng trong một cột chữ cách nhau cỡ giãn dòng; hàng của bảng thưa hơn. */
const MAX_LINE_GAP = 1.7
/** Khe cột hẹp nhất (theo cỡ chữ) — khe giữa ký hiệu mục và chữ của mục chỉ cỡ một cỡ chữ. */
const GUTTER = 2

interface Row {
  base: number
  u0: number
  u1: number
}

/** Gom các mảnh chữ cùng chân chữ thành từng dòng, từ trên xuống. */
function rowsOf(texts: ZoneItem[], size: number): Row[] {
  const rows: Row[] = []
  for (const text of [...texts].sort((a, b) => baseOf(a) - baseOf(b))) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(baseOf(text) - row.base) < size * 0.3) {
      row.u0 = Math.min(row.u0, text.u0)
      row.u1 = Math.max(row.u1, text.u1)
    } else {
      rows.push({ base: baseOf(text), u0: text.u0, u1: text.u1 })
    }
  }
  return rows
}

/** Một dải chữ có ra dáng cột văn bản không: đủ dòng, đủ rộng, phần lớn dòng chạy hết bề ngang, dòng sát nhau. */
export function looksLikeColumn(texts: ZoneItem[], size: number): boolean {
  const rows = rowsOf(texts, size)
  if (rows.length < MIN_LINES) return false
  const widest = Math.max(...rows.map((row) => row.u1 - row.u0))
  if (widest < size * MIN_WIDTH) return false
  const full = rows.filter((row) => row.u1 - row.u0 >= widest * FULL_LINE).length
  const tight = rows.slice(1).filter((row, at) => row.base - rows[at].base <= size * MAX_LINE_GAP).length
  return full * 2 >= rows.length && tight * 2 >= rows.length - 1
}

/** Chân chữ của dòng mở đầu mỗi đoạn, trừ đoạn đầu: dòng nằm sau một khoảng cách rộng hơn giãn dòng của cột. */
function paragraphStarts(texts: ZoneItem[], size: number): number[] {
  const rows = rowsOf(texts, size)
  const pitch = Math.min(...rows.slice(1).map((row, at) => row.base - rows[at].base))
  return rows.slice(1).flatMap((row, at) => (row.base - rows[at].base > pitch * PARAGRAPH_GAP ? [row.base] : []))
}

/**
 * Các đoạn của hai dải chữ có mở đầu NGANG HÀNG nhau không — dấu hiệu của bảng không viền: ô nào cũng bắt đầu cùng
 * hàng với ô bên cạnh, còn hai cột chữ chảy tự do thì đoạn bên này xuống dòng chỗ nào chẳng liên quan bên kia. Chỉ
 * cần mọi chỗ sang đoạn của bên ÍT đoạn hơn khớp với bên kia (bảng có ô trống thì một bên thiếu chỗ sang đoạn).
 */
function startsAlign(a: ZoneItem[], b: ZoneItem[], size: number): boolean {
  const [fewer, more] = [paragraphStarts(a, size), paragraphStarts(b, size)].sort((x, y) => x.length - y.length)
  return fewer.length > 0 && fewer.every((base) => more.some((other) => Math.abs(other - base) < size * 0.3))
}

const extent = (items: ZoneItem[]) => Math.max(...items.map((item) => item.v1)) - Math.min(...items.map((item) => item.v0))

interface Beside {
  boundary: number
  reach: number
  end: number
  bottom: number
}

/**
 * Cột chữ bên PHẢI khối (phía trái thì lật trục `u` rồi gọi lại). Thử từng mép
 * trái của chữ nằm bên phải khối, gần nhất trước: ngay trước mép ấy phải là một
 * khe trống chạy dài, hai bên khe đều là cột chữ. Vùng nhiều cột là khoảng giữa
 * hai vật vắt ngang khe gần khối nhất (tiêu đề phía trên, đoạn trải cả trang phía
 * dưới) — nét kẻ ngang của bảng cũng vắt qua khe nên bảng có viền không bị nhận nhầm.
 * Bảng KHÔNG viền thì nhận ra bằng `startsAlign`.
 */
function columnBeside(items: ZoneItem[], block: ColumnBlock, page: Extent, limit: number): Beside | null {
  const { size } = block
  const starts = new Set(items.filter((item) => item.text && item.u0 >= block.right + size * 0.5).map((item) => Math.round(item.u0)))
  for (const start of [...starts].sort((a, b) => a - b)) {
    const probe = start - size * 0.5
    const crossing = items.filter((item) => item.u0 < probe - size * 0.25 && item.u1 > probe + size * 0.25)
    if (crossing.some((item) => item.v0 < block.last && item.v1 > block.top)) continue
    const top = Math.max(page.v0, ...crossing.filter((item) => item.v1 <= block.top).map((item) => item.v1))
    const end = Math.min(limit, ...crossing.filter((item) => item.v0 >= block.last).map((item) => item.v0))

    const zone = items.filter((item) => item.v0 >= top - 0.5 && item.v1 <= end + 0.5)
    const far = zone.filter((item) => (item.u0 + item.u1) / 2 >= probe)
    const near = zone.filter((item) => item.text && (item.u0 + item.u1) / 2 < probe)
    const farText = far.filter((item) => item.text)
    if (!looksLikeColumn(farText, size) || !looksLikeColumn(near, size)) continue
    // Vùng thấp dễ là bảng không viền có ô nhiều dòng: coi nó là hai cột thì sửa một ô là hàng bên dưới lệch khỏi ô
    // cùng hàng. Vùng cao thì khỏi thử — hai cột chữ dài có đoạn tình cờ mở đầu ngang hàng là chuyện thường. Lấy bên
    // THẤP hơn: bên kia hay bị tiêu đề phía trên và dòng kết ngắn phía dưới (không vắt qua khe) kéo cao lên.
    const tall = Math.min(extent(farText), extent(near)) >= (page.v1 - page.v0) * MIN_SPAN
    if (!tall && startsAlign(near, farText, size)) continue
    const edge = Math.min(...farText.map((item) => item.u0))
    const reach = Math.max(...near.map((item) => item.u1))
    if (edge - reach < size * GUTTER) continue
    return { boundary: (edge + reach) / 2, reach, end, bottom: Math.max(...far.map((item) => item.v1)) }
  }
  return null
}

/** Cột chữ nằm cạnh cột đang sửa; `null` khi trang chỉ có một cột. `limit` = mép dưới của thân bài. */
export function sideColumns(items: ZoneItem[], block: ColumnBlock, page: Extent, limit: number): SideColumns | null {
  const shown = content(items, page)
  const right = columnBeside(shown, block, page, limit)
  const mirrored = shown.map((item) => ({ ...item, u0: -item.u1, u1: -item.u0 }))
  const left = columnBeside(mirrored, { ...block, left: -block.right, right: -block.left }, page, limit)
  if (!right && !left) return null

  const columns = {
    left: left ? -left.boundary : null,
    right: right?.boundary ?? null,
    reach: right?.reach ?? null,
    end: Math.max(left?.end ?? -Infinity, right?.end ?? -Infinity),
    other: Math.max(left?.bottom ?? -Infinity, right?.bottom ?? -Infinity),
  }
  const own = shown.filter((item) => item.v0 >= block.top && item.v1 <= columns.end + 0.5 && columnPart(item, columns) === 'own')
  return { ...columns, own: Math.max(block.last, ...own.map((item) => item.v1)) }
}

/** Vật này thuộc cột khác (`side` — đứng yên), cột đang sửa, hay nằm dưới vùng nhiều cột (`tail`). */
export function columnPart(item: Pick<ZoneItem, 'u0' | 'u1' | 'v0'>, columns: Pick<SideColumns, 'left' | 'right' | 'end'>): 'side' | 'own' | 'tail' {
  if (item.v0 >= columns.end - 0.5) return 'tail'
  const centre = (item.u0 + item.u1) / 2
  return (columns.right !== null && centre >= columns.right) || (columns.left !== null && centre <= columns.left) ? 'side' : 'own'
}
