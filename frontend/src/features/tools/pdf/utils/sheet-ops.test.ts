import { describe, expect, it } from 'vitest'
import type { PageRef } from '../types/doc-tools.types'
import { applySheet } from './sheet-ops'

function pagesOf(sourceId: string, count: number): PageRef[] {
  return Array.from({ length: count }, (_, index) => ({ id: `${sourceId}-${index + 1}`, sourceId, pageIndex: index, rotation: 0 }))
}

describe('applySheet', () => {
  const pen = { id: 'm', kind: 'pen' as const, color: 'red' as const, width: 1 as const, points: [{ x: 100, y: 100 }] }
  const pages: PageRef[] = [{ ...pagesOf('img', 1)[0], markups: [pen] }, pagesOf('pdf', 1)[0]]
  const sheet = { paper: 'a3' as const, margin: 10 }

  it('sets the sheet and moves marks with the image', () => {
    const moves = new Map([['img-1', { from: [{ x: 0, y: 0, width: 200, height: 200 }], to: [{ x: 50, y: 50, width: 400, height: 400 }] }]])
    const [image, pdf] = applySheet(pages, sheet, moves)
    expect(image.sheet).toEqual(sheet)
    expect(image.markups?.[0]).toMatchObject({ points: [{ x: 250, y: 250 }] })
    expect(pdf).toBe(pages[1])
  })

  it('returns the same array when no page moves', () => {
    expect(applySheet(pages, sheet, new Map())).toBe(pages)
  })
})
