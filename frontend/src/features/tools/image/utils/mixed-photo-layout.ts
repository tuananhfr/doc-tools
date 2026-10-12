import type { Size } from '../types/image.types'

export interface PhotoCopies { id: string; photo: Size; copies: number }
export interface PhotoPlacement extends Size { id: string; x: number; y: number }
export interface MixedSheetLayout { paper: Size; pages: PhotoPlacement[][] }
export const MIXED_SHEET_LIMITS = { copies: 500, sheets: 50 } as const

export function mixedPhotoLayout(paper: Size, requests: readonly PhotoCopies[], gap = 2, margin = 5): MixedSheetLayout {
  if (!Number.isFinite(gap) || gap < 0 || gap > 20 || !Number.isFinite(margin) || margin < 0 || margin * 2 >= Math.min(paper.width, paper.height)) throw new Error('INVALID_LAYOUT')
  const count = requests.reduce((total, request) => total + request.copies, 0)
  if (!count || count > MIXED_SHEET_LIMITS.copies) throw new Error('COPY_LIMIT')
  const pages: PhotoPlacement[][] = [[]]
  let x = margin, y = margin, rowHeight = 0
  for (const request of requests) {
    const { width, height } = request.photo
    if (!Number.isInteger(request.copies) || request.copies < 1 || !Number.isFinite(width) || !Number.isFinite(height) || width < 5 || height < 5 || width > paper.width - margin * 2 || height > paper.height - margin * 2) throw new Error('PHOTO_DOES_NOT_FIT')
    for (let index = 0; index < request.copies; index++) {
      if (x + width > paper.width - margin + .001) { x = margin; y += rowHeight + gap; rowHeight = 0 }
      if (y + height > paper.height - margin + .001) {
        if (pages.length >= MIXED_SHEET_LIMITS.sheets) throw new Error('SHEET_LIMIT')
        pages.push([]); x = margin; y = margin; rowHeight = 0
      }
      pages.at(-1)!.push({ id: request.id, x, y, width, height })
      x += width + gap; rowHeight = Math.max(rowHeight, height)
    }
  }
  return { paper: { ...paper }, pages }
}
