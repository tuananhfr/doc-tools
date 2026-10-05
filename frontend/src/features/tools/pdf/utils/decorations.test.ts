import { describe, expect, it } from 'vitest'
import type { HeaderFooter, ImageStamp } from '../types/decorations.types'
import {
  DEFAULT_HEADER_FOOTER,
  fillTokens,
  formatStampDate,
  hasDecorations,
  layoutHeaderFooter,
  layoutImageStamp,
  layoutStampAt,
  layoutWatermark,
  resolveDecorations,
  resolveScope,
  stampContext,
  stampRects,
} from './decorations'

const context = stampContext(1, 5, 1, '30/09/2026', 'hop-dong')

describe('stampContext', () => {
  it('counts each output file from its own first page', () => {
    expect(stampContext(0, 3, 1, '', '')).toMatchObject({ pageNumber: 1, lastNumber: 3 })
    expect(stampContext(2, 3, 1, '', '')).toMatchObject({ pageNumber: 3, lastNumber: 3 })
  })

  it('keeps "{n}/{N}" consistent with a custom start number', () => {
    expect(stampContext(4, 5, 0, '', '')).toMatchObject({ pageNumber: 4, lastNumber: 4 })
  })
})

describe('fillTokens', () => {
  it('fills every token and leaves other braces alone', () => {
    expect(fillTokens('Trang {n}/{N} · {date} · {file} {x}', context)).toBe('Trang 2/5 · 30/09/2026 · hop-dong {x}')
  })
})

describe('formatStampDate', () => {
  it('uses dd/MM/yyyy', () => {
    expect(formatStampDate(new Date(2026, 0, 5))).toBe('05/01/2026')
  })
})

describe('hasDecorations', () => {
  it('treats blank slots and blank watermark as off', () => {
    const blank: HeaderFooter = { ...DEFAULT_HEADER_FOOTER, slots: { ...DEFAULT_HEADER_FOOTER.slots, bottomCenter: '  ' } }
    expect(hasDecorations({ headerFooter: blank, watermark: null })).toBe(false)
    expect(hasDecorations({ headerFooter: null, watermark: { ...DEFAULT_HEADER_FOOTER, text: ' ', color: 'gray', opacity: 1, angle: 0 } })).toBe(false)
    expect(hasDecorations({ headerFooter: DEFAULT_HEADER_FOOTER, watermark: null })).toBe(true)
  })
})

describe('resolveScope', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('covers all or skips the first page', () => {
    expect(resolveScope({ mode: 'all', range: '' }, ids)).toEqual({ ok: true, ids: new Set(ids) })
    expect(resolveScope({ mode: 'skipFirst', range: '' }, ids)).toEqual({ ok: true, ids: new Set(['b', 'c', 'd']) })
  })

  it('maps ranges to page ids in grid order', () => {
    expect(resolveScope({ mode: 'range', range: '1, 3-4' }, ids)).toEqual({ ok: true, ids: new Set(['a', 'c', 'd']) })
  })

  it('reports empty or invalid ranges instead of guessing', () => {
    expect(resolveScope({ mode: 'range', range: ' ' }, ids).ok).toBe(false)
    expect(resolveScope({ mode: 'range', range: '9' }, ids).ok).toBe(false)
  })
})

describe('layoutHeaderFooter', () => {
  const page = { width: 600, height: 800 }
  const value: HeaderFooter = {
    ...DEFAULT_HEADER_FOOTER,
    fontSize: 10,
    margin: 20,
    slots: { ...DEFAULT_HEADER_FOOTER.slots, topLeft: '{file}', topRight: 'Ngày {date}', bottomCenter: 'Trang {n}/{N}' },
  }

  it('places filled slots and skips empty ones', () => {
    const placements = layoutHeaderFooter(value, page, context)
    expect(placements.map((placement) => [placement.slot, placement.text, placement.align])).toEqual([
      ['topLeft', 'hop-dong', 'start'],
      ['topRight', 'Ngày 30/09/2026', 'end'],
      ['bottomCenter', 'Trang 2/5', 'middle'],
    ])
  })

  it('keeps the text box inside the margins', () => {
    const [topLeft, topRight, bottom] = layoutHeaderFooter(value, page, context)
    expect(topLeft.anchor.x).toBe(20)
    expect(topRight.anchor.x).toBe(580)
    expect(topLeft.anchor.y).toBeGreaterThan(20)
    expect(bottom.anchor).toEqual({ x: 300, y: 800 - 20 - 2.5 })
  })
})

describe('layoutWatermark', () => {
  it('centres the watermark on the visible page', () => {
    const placement = layoutWatermark({ text: ' NHÁP ', fontSize: 40, color: 'red', opacity: 0.2, angle: 45, scope: { mode: 'all', range: '' } }, { width: 842, height: 595 })
    expect(placement).toMatchObject({ text: 'NHÁP', center: { x: 421, y: 297.5 }, angle: 45, size: 40, baselineShift: 14 })
  })
})

describe('resolveDecorations', () => {
  it('drops blank decorations and reports invalid scopes separately', () => {
    const resolved = resolveDecorations(
      {
        headerFooter: { ...DEFAULT_HEADER_FOOTER, scope: { mode: 'range', range: '7' } },
        watermark: { text: 'NHÁP', fontSize: 40, color: 'red', opacity: 0.2, angle: 45, scope: { mode: 'skipFirst', range: '' } },
      },
      ['a', 'b'],
    )
    expect(resolved.headerFooter).toBeNull()
    expect(resolved.errors.headerFooter).toBeTruthy()
    expect([...resolved.watermark!.pageIds]).toEqual(['b'])
  })
})

describe('layoutImageStamp', () => {
  const page = { width: 600, height: 800 }
  const stamp = (extra: Partial<ImageStamp>): ImageStamp => ({
    bytes: new Uint8Array([1]),
    mime: 'image/png',
    aspect: 0.5,
    anchor: 'bottomRight',
    widthRatio: 0.25,
    margin: 20,
    opacity: 1,
    scope: { mode: 'all', range: '' },
    ...extra,
  })

  it('sizes the stamp by page width and keeps the image ratio', () => {
    expect(layoutImageStamp(stamp({}), page)).toEqual({ x: 430, y: 705, width: 150, height: 75 })
  })

  it('anchors to each corner and to the centre inside the margin', () => {
    expect(layoutImageStamp(stamp({ anchor: 'topLeft' }), page)).toMatchObject({ x: 20, y: 20 })
    expect(layoutImageStamp(stamp({ anchor: 'center' }), page)).toMatchObject({ x: 225, y: 362.5 })
    expect(layoutImageStamp(stamp({ anchor: 'middleRight' }), page)).toMatchObject({ x: 430, y: 362.5 })
  })

  it('never lets the stamp run past the margins', () => {
    // Rộng 100% trang: thu về phần trong lề.
    expect(layoutImageStamp(stamp({ widthRatio: 1 }), page)).toEqual({ x: 20, y: 500, width: 560, height: 280 })
    // Ảnh dọc trên trang ngang: chiều cao chạm trần trước, bề rộng thu theo.
    expect(layoutImageStamp(stamp({ widthRatio: 0.5, aspect: 4, anchor: 'center' }), { width: 800, height: 600 })).toEqual({ x: 330, y: 20, width: 140, height: 560 })
  })

  it('takes part in hasDecorations and resolveDecorations', () => {
    const decorations = { headerFooter: null, watermark: null, imageStamp: stamp({ scope: { mode: 'skipFirst', range: '' } }) }
    expect(hasDecorations(decorations)).toBe(true)
    expect([...resolveDecorations(decorations, ['a', 'b', 'c']).imageStamp!.pageIds]).toEqual(['b', 'c'])
    expect(hasDecorations({ headerFooter: null, watermark: null, imageStamp: stamp({ bytes: new Uint8Array() }) })).toBe(false)
  })
})

describe('layoutStampAt', () => {
  const page = { width: 600, height: 800 }
  const mark = { aspect: 0.5, widthRatio: 0.25 }

  it('centres the stamp on the spot', () => {
    expect(layoutStampAt(mark, page, { x: 0.5, y: 0.5 })).toEqual({ x: 225, y: 362.5, width: 150, height: 75 })
  })

  it('keeps the whole stamp on the page near an edge', () => {
    expect(layoutStampAt(mark, page, { x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
    expect(layoutStampAt(mark, page, { x: 1, y: 1 })).toMatchObject({ x: 450, y: 725 })
  })

  it('shrinks a tall stamp to the page height', () => {
    expect(layoutStampAt({ aspect: 4, widthRatio: 0.5 }, { width: 800, height: 600 }, { x: 0.5, y: 0.5 })).toEqual({ x: 325, y: 0, width: 150, height: 600 })
  })
})

describe('free placement (spots)', () => {
  const page = { width: 600, height: 800 }
  const placed: ImageStamp = {
    bytes: new Uint8Array([1]),
    mime: 'image/png',
    aspect: 0.5,
    anchor: 'center',
    widthRatio: 0.25,
    margin: 0,
    opacity: 1,
    // Phạm vi hỏng cố ý: có `spots` thì không được đọc tới `scope`.
    scope: { mode: 'range', range: 'x' },
    spots: { a: [{ x: 0.5, y: 0.5 }, { x: 1, y: 1 }], b: [], d: [{ x: 0, y: 0 }] },
  }

  it('stamps only pages that carry a spot and still exist', () => {
    const resolved = resolveDecorations({ headerFooter: null, watermark: null, imageStamp: placed }, ['a', 'b', 'c'])
    expect(resolved.errors.imageStamp).toBeUndefined()
    expect([...resolved.imageStamp!.pageIds]).toEqual(['a'])
  })

  it('lays out one rect per spot, none on other pages', () => {
    expect(stampRects(placed, page, 'a')).toEqual([
      { x: 225, y: 362.5, width: 150, height: 75 },
      { x: 450, y: 725, width: 150, height: 75 },
    ])
    expect(stampRects(placed, page, 'c')).toEqual([])
  })

  it('falls back to the anchored rect without spots', () => {
    expect(stampRects({ ...placed, spots: undefined, anchor: 'topLeft' }, page, 'a')).toEqual([{ x: 0, y: 0, width: 150, height: 75 }])
  })
})
