import type { Rect } from '../types/markup.types'

/**
 * Soi bản scan trên ảnh xám thu nhỏ (spec 01 — "deskew, auto-crop,
 * blank-page detection"). Chỉ GỢI Ý: người dùng xem lại rồi mới áp dụng, nên
 * ngưỡng nghiêng về phía bỏ sót hơn là làm sai.
 */

export interface GrayImage {
  width: number
  height: number
  /** Độ sáng 0–255, theo hàng. */
  data: Uint8Array
}

export interface ScanFindings {
  blank: boolean
  /** Độ nghiêng (độ) của dòng chữ, dương = nghiêng xuôi chiều kim đồng hồ; `null` = thẳng hoặc không đo được. */
  skew: number | null
  /** Vùng tờ giấy (tỉ lệ 0–1 theo khổ ảnh) khi quanh nó có viền tối; `null` = không có viền đáng cắt. */
  paper: Rect | null
}

/** Mép ảnh hay dính bóng máy scan, lỗ bấm ghim — không tính khi xét trang trắng. */
const EDGE = 0.05
/** Tỉ lệ điểm mực tối thiểu (sau khi lọc hạt bụi) để coi là trang có nội dung. */
const BLANK_INK = 0.0002
const MAX_SKEW = 5
/** Dưới mức này mắt thường khó thấy, chỉnh chỉ làm mờ ảnh thêm. */
const MIN_SKEW = 0.3
/** Cần đủ mực để đo được dòng chữ — trang chỉ có vài nét thì đo ra góc ngẫu nhiên. */
const SKEW_MIN_INK = 0.003
const SKEW_MAX_POINTS = 120_000

export function toGray(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height)
  for (let index = 0, offset = 0; index < data.length; index++, offset += 4) {
    data[index] = (rgba[offset] * 77 + rgba[offset + 1] * 150 + rgba[offset + 2] * 29) >> 8
  }
  return { width, height, data }
}

function histogram(image: GrayImage): number[] {
  const bins = new Array<number>(256).fill(0)
  for (const value of image.data) bins[value]++
  return bins
}

function percentile(bins: number[], total: number, fraction: number): number {
  let seen = 0
  for (let value = 0; value < 256; value++) {
    seen += bins[value]
    if (seen >= total * fraction) return value
  }
  return 255
}

/** Ngưỡng Otsu: chia hai nhóm sáng/tối sao cho phương sai giữa hai nhóm lớn nhất. */
export function otsuThreshold(bins: number[], total: number): number {
  let sum = 0
  for (let value = 0; value < 256; value++) sum += value * bins[value]
  let darkWeight = 0
  let darkSum = 0
  let best = 0
  let threshold = 127
  for (let value = 0; value < 256; value++) {
    darkWeight += bins[value]
    if (darkWeight === 0) continue
    const lightWeight = total - darkWeight
    if (lightWeight === 0) break
    darkSum += value * bins[value]
    const between = darkWeight * lightWeight * (darkSum / darkWeight - (sum - darkSum) / lightWeight) ** 2
    if (between > best) {
      best = between
      threshold = value
    }
  }
  return threshold
}

/** Điểm "mực": tối hơn hẳn nền giấy (nền = mức sáng phần lớn ảnh đạt tới). */
function inkMask(image: GrayImage): Uint8Array {
  const bins = histogram(image)
  const paper = percentile(bins, image.data.length, 0.9)
  const cut = paper - Math.max(50, paper * 0.3)
  const mask = new Uint8Array(image.data.length)
  for (let index = 0; index < mask.length; index++) mask[index] = image.data[index] < cut ? 1 : 0
  return mask
}

const WHOLE: Rect = { x: 0, y: 0, width: 1, height: 1 }

/** Vùng (tỉ lệ 0–1) thu vào mỗi phía `inset` → khoảng điểm ảnh, chừa 1 điểm sát mép để xét điểm kề. */
function pixelRange(image: GrayImage, region: Rect, inset: number) {
  const { width, height } = image
  const insetX = region.width * inset
  const insetY = region.height * inset
  return {
    x0: Math.max(1, Math.floor((region.x + insetX) * width)),
    x1: Math.min(width - 1, Math.ceil((region.x + region.width - insetX) * width)),
    y0: Math.max(1, Math.floor((region.y + insetY) * height)),
    y1: Math.min(height - 1, Math.ceil((region.y + region.height - insetY) * height)),
  }
}

/** Tỉ lệ điểm mực có ≥ 3 điểm mực kề bên (bỏ hạt bụi lẻ) trong `region` trừ mép. */
export function inkRatio(image: GrayImage, region: Rect = WHOLE, mask = inkMask(image)): number {
  const { width } = image
  const { x0, x1, y0, y1 } = pixelRange(image, region, EDGE)
  let ink = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = y * width + x
      if (!mask[index]) continue
      const neighbours =
        mask[index - width - 1] + mask[index - width] + mask[index - width + 1] + mask[index - 1] + mask[index + 1] + mask[index + width - 1] + mask[index + width] + mask[index + width + 1]
      if (neighbours >= 3) ink++
    }
  }
  const area = Math.max(1, (x1 - x0) * (y1 - y0))
  return ink / area
}

/**
 * Góc nghiêng bằng phép chiếu: xoay thử các góc, góc đúng làm dòng chữ dồn
 * vào ít hàng nhất (tổng bình phương số điểm mỗi hàng lớn nhất).
 */
export function estimateSkew(image: GrayImage, region: Rect = WHOLE, mask = inkMask(image)): number | null {
  const { width, height } = image
  // Thu vào 3%: mép giấy nghiêng cạnh viền tối cũng là một "dòng" rất dài, kéo lệch kết quả.
  const { x0, x1, y0, y1 } = pixelRange(image, region, 0.03)
  const points: number[] = []
  let total = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) total += mask[y * width + x]
  if (total < (x1 - x0) * (y1 - y0) * SKEW_MIN_INK) return null
  const stride = Math.max(1, Math.ceil(total / SKEW_MAX_POINTS))
  let counter = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!mask[y * width + x]) continue
      if (counter++ % stride === 0) points.push(x - width / 2, y - height / 2)
    }
  }
  const span = Math.ceil(Math.hypot(width, height))
  const rows = new Float64Array(span * 2 + 2)
  const score = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180
    const sin = Math.sin(radians)
    const cos = Math.cos(radians)
    rows.fill(0)
    for (let index = 0; index < points.length; index += 2) rows[Math.round(points[index + 1] * cos - points[index] * sin) + span]++
    let sum = 0
    for (const count of rows) sum += count * count
    return sum
  }
  const search = (from: number, to: number, step: number) => {
    let best = from
    let bestScore = -1
    for (let angle = from; angle <= to + 1e-9; angle += step) {
      const value = score(angle)
      if (value > bestScore) {
        bestScore = value
        best = angle
      }
    }
    return { angle: best, score: bestScore }
  }
  const coarse = search(-MAX_SKEW, MAX_SKEW, 0.5)
  const fine = search(coarse.angle - 0.5, coarse.angle + 0.5, 0.05)
  // Không nổi bật hơn hẳn góc 0 → ảnh không có dòng rõ (hình vẽ, ảnh chụp) — đừng xoay bừa.
  if (fine.score < score(0) * 1.03) return null
  const angle = Math.round(fine.angle * 100) / 100
  return Math.abs(angle) < MIN_SKEW || Math.abs(angle) > MAX_SKEW - 0.05 ? null : angle
}

/** Trung bình trượt — hàng có dòng chữ dày tối hơn nửa bề ngang, đừng để nó cắt đôi tờ giấy. */
function smooth(values: Float64Array, window: number): Float64Array {
  const half = Math.max(1, Math.round(window / 2))
  const result = new Float64Array(values.length)
  let sum = 0
  let count = 0
  for (let index = 0; index < values.length + half; index++) {
    if (index < values.length) {
      sum += values[index]
      count++
    }
    if (index - 2 * half - 1 >= 0) {
      sum -= values[index - 2 * half - 1]
      count--
    }
    const center = index - half
    if (center >= 0 && center < values.length) result[center] = sum / count
  }
  return result
}

/** Đoạn liên tục dài nhất có giá trị ≥ `min`. */
function longestRun(values: Float64Array | number[], min: number): [number, number] | null {
  let best: [number, number] | null = null
  let start = -1
  for (let index = 0; index <= values.length; index++) {
    if (index < values.length && values[index] >= min) {
      if (start < 0) start = index
      continue
    }
    if (start >= 0 && (!best || index - start > best[1] - best[0])) best = [start, index]
    start = -1
  }
  return best
}

/** Đoạn sáng của tờ giấy: tìm trên đường đã làm mượt, rồi kéo mép về đúng hàng/cột thật (làm mượt làm nhoè mép). */
function paperRun(values: Float64Array, window: number): [number, number] | null {
  const run = longestRun(smooth(values, window), 0.5)
  if (!run) return null
  const reach = Math.ceil(window)
  let [start, end] = run
  for (let index = Math.max(0, start - reach); index <= start + reach && index < end; index++) {
    if (values[index] >= 0.5) {
      start = index
      break
    }
  }
  for (let index = Math.min(values.length, end + reach) - 1; index >= end - reach && index > start; index--) {
    if (values[index] >= 0.5) {
      end = index + 1
      break
    }
  }
  return [start, end]
}

/**
 * Tờ giấy trong ảnh chụp / bản scan có viền tối (nắp máy scan, mặt bàn):
 * hàng/cột mà đa số điểm sáng là giấy. Viền mỏng hơn 1,5% hoặc không tối hơn
 * giấy rõ rệt thì bỏ qua — cắt đi chỉ mất lề.
 */
export function paperBounds(image: GrayImage): Rect | null {
  const { width, height, data } = image
  const bins = histogram(image)
  const threshold = otsuThreshold(bins, data.length)
  const rowLight = new Float64Array(height)
  for (let y = 0; y < height; y++) {
    let light = 0
    for (let x = 0; x < width; x++) if (data[y * width + x] > threshold) light++
    rowLight[y] = light / width
  }
  const rows = paperRun(rowLight, height * 0.03)
  if (!rows) return null
  const colLight = new Float64Array(width)
  for (let x = 0; x < width; x++) {
    let light = 0
    for (let y = rows[0]; y < rows[1]; y++) if (data[y * width + x] > threshold) light++
    colLight[x] = light / (rows[1] - rows[0])
  }
  const cols = paperRun(colLight, width * 0.03)
  if (!cols) return null

  const box = { x: cols[0] / width, y: rows[0] / height, width: (cols[1] - cols[0]) / width, height: (rows[1] - rows[0]) / height }
  const trimmed = Math.max(box.x, box.y, 1 - box.x - box.width, 1 - box.y - box.height)
  if (trimmed < 0.015 || box.width * box.height < 0.3) return null

  // Phần bị cắt phải tối hơn giấy rõ rệt — không thì đó là lề trắng / hình nhạt, không phải viền.
  let inside = 0
  let insideCount = 0
  let outside = 0
  let outsideCount = 0
  for (let y = 0; y < height; y++) {
    const inRow = y >= rows[0] && y < rows[1]
    for (let x = 0; x < width; x++) {
      if (inRow && x >= cols[0] && x < cols[1]) {
        inside += data[y * width + x]
        insideCount++
      } else {
        outside += data[y * width + x]
        outsideCount++
      }
    }
  }
  if (outsideCount === 0 || inside / insideCount - outside / outsideCount < 60) return null
  return box
}

/** Trang có lớp chữ (PDF số, đã OCR) không bao giờ là trang trắng, và không chỉnh hình — chỉnh là lệch lớp chữ. */
export function analyzeScan(image: GrayImage, { hasText }: { hasText: boolean }): ScanFindings {
  if (hasText) return { blank: false, skew: null, paper: null }
  const mask = inkMask(image)
  const paper = paperBounds(image)
  const region = paper ?? WHOLE
  return { blank: inkRatio(image, region, mask) < BLANK_INK, skew: estimateSkew(image, region, mask), paper }
}
