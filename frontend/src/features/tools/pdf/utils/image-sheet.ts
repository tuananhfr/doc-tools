import type { ImageSheet, Paper, Rotation } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { A4_SIZE, type Size } from './page-geometry'

/** Mặc định = đúng hành vi cũ: tờ A4 xoay theo chiều ảnh, ảnh chạm mép. */
export const DEFAULT_SHEET: ImageSheet = { paper: 'a4', margin: 0 }

export const SHEET_MARGINS = [0, 10, 20] as const

const PAPER_SIZE: Record<Exclude<Paper, 'fit'>, Size> = {
  a4: A4_SIZE,
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612, height: 792 },
}

const PT_PER_MM = 72 / 25.4
/** Khe giữa hai ảnh trên trang gộp — không có khe thì hai ảnh nền trắng dính thành một. */
const GAP_MM = 5

export const COLLAGE_SIZES = [2, 4] as const
export type CollageSize = (typeof COLLAGE_SIZES)[number]

/** Tờ giấy + chỗ đặt từng ảnh (pt, khung gốc: gốc trên-trái, y xuống). */
export interface SheetLayout {
  size: Size
  slots: Rect[]
}

export function sheetOf(sheet: ImageSheet | undefined): ImageSheet {
  return sheet ?? DEFAULT_SHEET
}

export function sameSheet(a: ImageSheet | undefined, b: ImageSheet | undefined): boolean {
  const left = sheetOf(a)
  const right = sheetOf(b)
  return left.paper === right.paper && left.margin === right.margin
}

export function isDefaultSheet(sheet: ImageSheet | undefined): boolean {
  return sameSheet(sheet, DEFAULT_SHEET)
}

/** Kích thước ảnh sau khi xoay `rotation` (chiều kim đồng hồ). */
export function rotatedSize(size: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270 ? { width: size.height, height: size.width } : size
}

function oriented(paper: Size, landscape: boolean): Size {
  const long = Math.max(paper.width, paper.height)
  const short = Math.min(paper.width, paper.height)
  return landscape ? { width: long, height: short } : { width: short, height: long }
}

function fitInside(image: Size, box: Rect): Rect {
  const scale = Math.min(box.width / image.width, box.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height }
}

/** Số cột × hàng và chiều tờ giấy cho `count` ảnh. */
function grid(images: Size[]): { cols: number; rows: number; landscape: boolean } {
  const wide = images.filter((image) => image.width > image.height).length
  const mostlyWide = wide * 2 >= images.length
  if (images.length === 1) return { cols: 1, rows: 1, landscape: images[0].width > images[0].height }
  // Hai ảnh ngang xếp chồng trên tờ đứng, hai ảnh đứng xếp cạnh nhau trên tờ ngang — ảnh to nhất có thể.
  if (images.length === 2) return mostlyWide ? { cols: 1, rows: 2, landscape: false } : { cols: 2, rows: 1, landscape: true }
  return { cols: 2, rows: Math.ceil(images.length / 2), landscape: mostlyWide }
}

/**
 * Dàn ảnh lên tờ giấy. Xem trước, ảnh thu nhỏ, xuất PDF và dời đánh dấu khi
 * đổi khổ đều gọi CHUNG hàm này — lệch một chỗ là dấu trên màn hình không
 * khớp tệp ra.
 *
 * "Vừa ảnh" với một ảnh: tờ giấy ôm sát ảnh (cộng lề), cạnh dài bằng cạnh dài
 * A4 để in ra vẫn đúng cỡ quen thuộc; trang gộp nhiều ảnh thì "vừa ảnh" = A4.
 */
export function layoutSheet(images: Size[], sheet?: ImageSheet): SheetLayout {
  const { paper, margin: marginMm } = sheetOf(sheet)
  const margin = marginMm * PT_PER_MM
  const { cols, rows, landscape } = grid(images)
  const paperSize = oriented(PAPER_SIZE[paper === 'fit' ? 'a4' : paper], landscape)

  if (paper === 'fit' && images.length === 1) {
    const content = fitInside(images[0], { x: 0, y: 0, width: paperSize.width - margin * 2, height: paperSize.height - margin * 2 })
    return {
      size: { width: content.width + margin * 2, height: content.height + margin * 2 },
      slots: [{ x: margin, y: margin, width: content.width, height: content.height }],
    }
  }

  const gap = images.length > 1 ? GAP_MM * PT_PER_MM : 0
  const cellWidth = (paperSize.width - margin * 2 - gap * (cols - 1)) / cols
  const cellHeight = (paperSize.height - margin * 2 - gap * (rows - 1)) / rows
  const slots = images.map((image, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return fitInside(image, {
      x: margin + col * (cellWidth + gap),
      y: margin + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    })
  })
  return { size: paperSize, slots }
}

/**
 * Tham số `drawImage` của pdf-lib để ảnh xoay `rotation` (chiều kim đồng hồ)
 * lấp đúng `slot`. pdf-lib xoay NGƯỢC chiều kim đồng hồ quanh góc dưới-trái
 * của ảnh, trong hệ y hướng lên — nên góc neo đổi theo từng góc xoay.
 */
export function pdfImagePlacement(slot: Rect, rotation: Rotation, pageHeight: number) {
  const left = slot.x
  const bottom = pageHeight - slot.y - slot.height
  const sideways = rotation === 90 || rotation === 270
  const width = sideways ? slot.height : slot.width
  const height = sideways ? slot.width : slot.height
  switch (rotation) {
    case 0:
      return { x: left, y: bottom, width, height, rotate: 0 }
    case 90:
      return { x: left, y: bottom + slot.height, width, height, rotate: -90 }
    case 180:
      return { x: left + slot.width, y: bottom + slot.height, width, height, rotate: 180 }
    case 270:
      return { x: left + slot.width, y: bottom, width, height, rotate: 90 }
  }
}

export function sheetKey(sheet: ImageSheet | undefined): string {
  const { paper, margin } = sheetOf(sheet)
  return `${paper}-${margin}`
}
