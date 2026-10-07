import { dateTimeFormat } from '@/i18n/intl'
import { translate } from '@/i18n/runtime'
import type {
  Decorations,
  HeaderFooter,
  ImageStamp,
  PageScope,
  StampAnchor,
  StampContext,
  StampSlot,
  Watermark,
  WatermarkColor,
} from '../types/decorations.types'
import type { Rect } from '../types/markup.types'
import type { Point, Size, TextAlign } from './page-geometry'
import { parsePageRanges } from './page-ops'

export type Rgb = readonly [number, number, number]

/**
 * Màu IN RA tệp, không phải màu giao diện — không đi qua token theme vì tệp
 * xuất phải giống nhau dù người dùng đang ở theme Sáng, Tối hay Field.
 */
export const DOCUMENT_COLORS: Record<WatermarkColor | 'text', Rgb> = {
  text: [0.2, 0.22, 0.25],
  gray: [0.45, 0.49, 0.54],
  red: [0.78, 0.12, 0.16],
  blue: [0.12, 0.35, 0.7],
}

export function rgbCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

export const STAMP_TOKENS = [
  { token: '{n}', id: 'page' },
  { token: '{N}', id: 'total' },
  { token: '{date}', id: 'date' },
  { token: '{file}', id: 'file' },
] as const

const ALL_PAGES: PageScope = { mode: 'all', range: '' }

export const HEADER_FOOTER_BASE: HeaderFooter = {
  slots: { topLeft: '', topCenter: '', topRight: '', bottomLeft: '', bottomCenter: '', bottomRight: '' },
  fontSize: 10,
  margin: 28,
  startNumber: 1,
  scope: ALL_PAGES,
}

export const WATERMARK_BASE: Watermark = {
  text: '',
  fontSize: 60,
  color: 'gray',
  opacity: 0.2,
  angle: 45,
  scope: ALL_PAGES,
}

// Chữ mặc định in vào PDF theo ngôn ngữ trang, nên dựng lúc dùng chứ không phải hằng số lúc nạp module.
export function defaultHeaderFooter(): HeaderFooter {
  return { ...HEADER_FOOTER_BASE, slots: { ...HEADER_FOOTER_BASE.slots, bottomCenter: translate('pdf:file.pageFooter') } }
}

export function defaultWatermark(): Watermark {
  return { ...WATERMARK_BASE, text: translate('pdf:file.watermark') }
}

export const NO_DECORATIONS: Decorations = { headerFooter: null, watermark: null }

const STAMP_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

export function formatStampDate(date: Date): string {
  return dateTimeFormat(STAMP_DATE).format(date)
}

export function fillTokens(template: string, context: StampContext): string {
  return template.replace(/\{(n|N|date|file)\}/g, (_, key: string) => {
    if (key === 'n') return String(context.pageNumber)
    if (key === 'N') return String(context.lastNumber)
    if (key === 'date') return context.date
    return context.fileName
  })
}

/**
 * Ngữ cảnh của trang thứ `index` (đếm từ 0) trong MỘT tệp xuất. Mỗi tệp tự
 * đếm lại từ `startNumber` — tách ra 3 tệp thì cả 3 đều in "Trang 1/…".
 * `{N}` là số in ở trang CUỐI, nên "Trang {n}/{N}" luôn khớp dù số bắt đầu khác 1.
 */
export function stampContext(index: number, count: number, startNumber: number, date: string, fileName: string): StampContext {
  return { pageNumber: startNumber + index, lastNumber: startNumber + count - 1, date, fileName }
}

export function hasHeaderFooter(value: HeaderFooter | null): value is HeaderFooter {
  return !!value && Object.values(value.slots).some((text) => text.trim() !== '')
}

export function hasWatermark(value: Watermark | null): value is Watermark {
  return !!value && value.text.trim() !== ''
}

export function hasImageStamp(value: ImageStamp | null | undefined): value is ImageStamp {
  return !!value && value.bytes.byteLength > 0 && value.widthRatio > 0
}

export function hasDecorations(value: Decorations): boolean {
  return hasHeaderFooter(value.headerFooter) || hasWatermark(value.watermark) || hasImageStamp(value.imageStamp)
}

export type ScopeResult = { ok: true; ids: Set<string> } | { ok: false; message: string }

/** Phạm vi áp → tập id trang, tính theo thứ tự hiện tại trên lưới. */
export function resolveScope(scope: PageScope, pageIds: string[]): ScopeResult {
  if (scope.mode === 'all') return { ok: true, ids: new Set(pageIds) }
  if (scope.mode === 'skipFirst') return { ok: true, ids: new Set(pageIds.slice(1)) }
  if (scope.range.trim() === '') return { ok: false, message: translate('pdf:scope.enterRange') }

  const parsed = parsePageRanges(scope.range, pageIds.length)
  if (!parsed.ok) return parsed
  return { ok: true, ids: new Set(parsed.groups.flat().map((index) => pageIds[index])) }
}

export interface ScopedDecoration<T> {
  value: T
  pageIds: Set<string>
}

/** Trang trí đã quy phạm vi ra id trang — lớp phủ và lúc xuất đọc CÙNG một kết quả. */
export interface ResolvedDecorations {
  headerFooter: ScopedDecoration<HeaderFooter> | null
  watermark: ScopedDecoration<Watermark> | null
  imageStamp: ScopedDecoration<ImageStamp> | null
  errors: { headerFooter?: string; watermark?: string; imageStamp?: string }
}

export function resolveDecorations(decorations: Decorations, pageIds: string[]): ResolvedDecorations {
  const result: ResolvedDecorations = { headerFooter: null, watermark: null, imageStamp: null, errors: {} }

  if (hasHeaderFooter(decorations.headerFooter)) {
    const scope = resolveScope(decorations.headerFooter.scope, pageIds)
    if (scope.ok) result.headerFooter = { value: decorations.headerFooter, pageIds: scope.ids }
    else result.errors.headerFooter = scope.message
  }
  if (hasWatermark(decorations.watermark)) {
    const scope = resolveScope(decorations.watermark.scope, pageIds)
    if (scope.ok) result.watermark = { value: decorations.watermark, pageIds: scope.ids }
    else result.errors.watermark = scope.message
  }
  if (hasImageStamp(decorations.imageStamp)) {
    const { spots, scope: range } = decorations.imageStamp
    const scope: ScopeResult = spots ? { ok: true, ids: new Set(pageIds.filter((id) => (spots[id]?.length ?? 0) > 0)) } : resolveScope(range, pageIds)
    if (scope.ok) result.imageStamp = { value: decorations.imageStamp, pageIds: scope.ids }
    else result.errors.imageStamp = scope.message
  }
  return result
}

export function isDecorated(resolved: ResolvedDecorations): boolean {
  return resolved.headerFooter !== null || resolved.watermark !== null || resolved.imageStamp !== null
}

export interface StampPlacement {
  slot: StampSlot
  text: string
  /** Điểm neo trên đường chân chữ, hệ nhìn thấy. */
  anchor: Point
  align: TextAlign
  size: number
}

const SLOT_ALIGN: Record<StampSlot, TextAlign> = {
  topLeft: 'start',
  topCenter: 'middle',
  topRight: 'end',
  bottomLeft: 'start',
  bottomCenter: 'middle',
  bottomRight: 'end',
}

/* Tỉ lệ theo cỡ chữ: phần chữ nằm trên và dưới đường chân chữ — để lề tính tới
   MÉP chữ chứ không tới đường chân chữ (Be Vietnam Pro: hoa ~0,7, dấu mũ tới ~0,9). */
const ASCENT = 0.9
const DESCENT = 0.25

export function layoutHeaderFooter(value: HeaderFooter, page: Size, context: StampContext): StampPlacement[] {
  const { fontSize: size, margin } = value
  const x = { start: margin, middle: page.width / 2, end: page.width - margin }
  const top = margin + ASCENT * size
  const bottom = page.height - margin - DESCENT * size

  return (Object.entries(value.slots) as [StampSlot, string][])
    .map(([slot, template]) => {
      const align = SLOT_ALIGN[slot]
      return {
        slot,
        text: fillTokens(template, context).trim(),
        anchor: { x: x[align], y: slot.startsWith('top') ? top : bottom },
        align,
        size,
      }
    })
    .filter((placement) => placement.text !== '')
}

export interface WatermarkPlacement {
  text: string
  center: Point
  angle: number
  size: number
  /** Hạ đường chân chữ để TÂM dòng chữ (không phải chân chữ) nằm giữa trang. */
  baselineShift: number
}

export function layoutWatermark(value: Watermark, page: Size): WatermarkPlacement {
  return {
    text: value.text.trim(),
    center: { x: page.width / 2, y: page.height / 2 },
    angle: value.angle,
    size: value.fontSize,
    baselineShift: 0.35 * value.fontSize,
  }
}

/** Vị trí neo theo hai trục: 0 = mép trái / trên, 0,5 = giữa, 1 = mép phải / dưới. */
const ANCHOR_AXES: Record<StampAnchor, readonly [number, number]> = {
  topLeft: [0, 0],
  topCenter: [0.5, 0],
  topRight: [1, 0],
  middleLeft: [0, 0.5],
  center: [0.5, 0.5],
  middleRight: [1, 0.5],
  bottomLeft: [0, 1],
  bottomCenter: [0.5, 1],
  bottomRight: [1, 1],
}

/**
 * Khung dấu ảnh trên trang nhìn thấy. Ảnh dọc trên trang ngang có thể cao hơn
 * phần trong lề — thu lại cho vừa chứ không để dấu tràn ra ngoài trang.
 */
export function layoutImageStamp(value: ImageStamp, page: Size): Rect {
  const room = { width: Math.max(0, page.width - 2 * value.margin), height: Math.max(0, page.height - 2 * value.margin) }
  let width = Math.min(page.width * value.widthRatio, room.width)
  let height = width * value.aspect
  if (height > room.height) {
    height = room.height
    width = value.aspect > 0 ? height / value.aspect : 0
  }
  const [fx, fy] = ANCHOR_AXES[value.anchor]
  return { x: value.margin + fx * (room.width - width), y: value.margin + fy * (room.height - height), width, height }
}

/**
 * Khung dấu đặt tự do: tâm ở `at` (tỉ lệ trang), kẹp lại cho cả dấu nằm trong
 * trang — chữ ký đặt sát mép không bị cắt mất nửa khi xuất.
 */
export function layoutStampAt(value: Pick<ImageStamp, 'aspect' | 'widthRatio'>, page: Size, at: Point): Rect {
  let width = Math.min(page.width * value.widthRatio, page.width)
  let height = width * value.aspect
  if (height > page.height) {
    height = page.height
    width = value.aspect > 0 ? height / value.aspect : 0
  }
  const clamp = (centre: number, side: number, whole: number) => Math.min(whole - side, Math.max(0, centre - side / 2))
  return { x: clamp(at.x * page.width, width, page.width), y: clamp(at.y * page.height, height, page.height), width, height }
}

/** Mọi khung dấu ảnh trên MỘT trang: theo chỗ đã đặt nếu có `spots`, không thì một khung theo vị trí neo. */
export function stampRects(value: ImageStamp, page: Size, pageId: string): Rect[] {
  if (!value.spots) return [layoutImageStamp(value, page)]
  return (value.spots[pageId] ?? []).map((at) => layoutStampAt(value, page, at))
}
