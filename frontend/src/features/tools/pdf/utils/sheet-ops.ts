import type { ImageSheet, PageRef } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { remapMarkups } from './markup-transform'

// Không đặt trong page-ops: decorations → page-ops → dời dấu → markup-geometry → decorations thành vòng import, module nạp dở.

/** Chỗ đặt ảnh của một trang ảnh trước và sau khi đổi khổ giấy. */
export interface SheetMove {
  from: Rect[]
  to: Rect[]
}

/** Đổi khổ giấy / lề cho các trang ảnh trong `moves`; dấu đi theo ảnh nó nằm trên. */
export function applySheet(pages: PageRef[], sheet: ImageSheet, moves: ReadonlyMap<string, SheetMove>): PageRef[] {
  if (moves.size === 0) return pages
  return pages.map((page) => {
    const move = moves.get(page.id)
    if (!move) return page
    const markups = remapMarkups(page.markups, move.from, move.to)
    return markups ? { ...page, sheet, markups } : { ...page, sheet }
  })
}
