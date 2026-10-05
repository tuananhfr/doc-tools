import { describe, expect, it } from 'vitest'
import type { MeasureReference, MeasureShape } from '../types/measure.types'
import { distance, formatArea, formatLength, labelAnchor, polygonArea, polygonPerimeter, scaleOf, shapeLabel, summarize } from './measure'
import { INITIAL_MEASURE, measureReducer, type MeasureAction } from './measure-state'

const p = (x: number, y: number) => ({ x, y })
const run = (...actions: MeasureAction[]) => actions.reduce(measureReducer, INITIAL_MEASURE)

describe('hình học', () => {
  it('khoảng cách và chu vi', () => {
    expect(distance(p(0, 0), p(3, 4))).toBe(5)
    expect(polygonPerimeter([p(0, 0), p(4, 0), p(4, 3)])).toBe(12)
  })

  it('diện tích không phụ thuộc chiều đi của đỉnh', () => {
    const square = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)]
    expect(polygonArea(square)).toBe(100)
    expect(polygonArea([...square].reverse())).toBe(100)
    expect(polygonArea([p(0, 0), p(4, 0), p(4, 3)])).toBe(6)
  })
})

describe('quy đổi theo đoạn chuẩn', () => {
  const reference: MeasureReference = { points: [p(0, 0), p(200, 0)], length: 1, unit: 'm' }

  it('200 px ứng với 1 m', () => {
    const scale = scaleOf(reference)
    expect(scale).toEqual({ perPixel: 0.005, unit: 'm' })
    expect(formatLength(650, scale)).toBe('3,25 m')
    expect(formatArea(200 * 400, scale)).toBe('2 m²')
  })

  it('chưa đủ dữ kiện thì không có hệ số, số đo ghi theo điểm ảnh', () => {
    expect(scaleOf(null)).toBeNull()
    expect(scaleOf({ ...reference, length: null })).toBeNull()
    expect(scaleOf({ ...reference, length: 0 })).toBeNull()
    expect(scaleOf({ ...reference, points: [p(5, 5), p(5, 5)] })).toBeNull()
    expect(formatLength(1234.6, null)).toBe('1.235 px')
    expect(formatArea(53200, null)).toBe('53.200 px²')
  })
})

describe('nhãn của hình', () => {
  const shapes: MeasureShape[] = [
    { id: 1, kind: 'count', points: [p(1, 1)] },
    { id: 2, kind: 'distance', points: [p(0, 0), p(30, 40)] },
    { id: 3, kind: 'count', points: [p(2, 2)] },
    { id: 4, kind: 'area', points: [p(0, 0), p(10, 0), p(10, 10), p(0, 10)] },
  ]

  it('điểm đếm đánh số trong các điểm đếm, không tính hình khác', () => {
    expect(shapeLabel(shapes[0], shapes, null)).toBe('1')
    expect(shapeLabel(shapes[2], shapes, null)).toBe('2')
  })

  it('đoạn và vùng ghi số đo, đặt ở giữa hình', () => {
    expect(shapeLabel(shapes[1], shapes, null)).toBe('50 px')
    expect(shapeLabel(shapes[3], shapes, null)).toBe('100 px²')
    expect(labelAnchor(shapes[1])).toEqual(p(15, 20))
    expect(labelAnchor(shapes[3])).toEqual(p(5, 5))
  })

  it('đếm theo loại', () => {
    expect(summarize(shapes)).toEqual({ distances: 1, areas: 1, counts: 2 })
  })
})

describe('measureReducer', () => {
  it('đo khoảng cách: hai lần bấm thành một đoạn', () => {
    const state = run({ type: 'point', point: p(0, 0) }, { type: 'point', point: p(10, 0) })
    expect(state.shapes).toEqual([{ id: 1, kind: 'distance', points: [p(0, 0), p(10, 0)] }])
    expect(state.draft).toEqual([])
    expect(state.nextId).toBe(2)
  })

  it('đo diện tích: chỉ khép được từ 3 đỉnh', () => {
    const two = run({ type: 'mode', mode: 'area' }, { type: 'point', point: p(0, 0) }, { type: 'point', point: p(10, 0) }, { type: 'close' })
    expect(two.shapes).toEqual([])
    expect(two.draft).toHaveLength(2)
    const three = measureReducer(measureReducer(two, { type: 'point', point: p(10, 10) }), { type: 'close' })
    expect(three.shapes).toEqual([{ id: 1, kind: 'area', points: [p(0, 0), p(10, 0), p(10, 10)] }])
    expect(three.draft).toEqual([])
  })

  it('đếm: mỗi lần bấm một điểm', () => {
    const state = run({ type: 'mode', mode: 'count' }, { type: 'point', point: p(1, 1) }, { type: 'point', point: p(2, 2) })
    expect(state.shapes.map((shape) => shape.kind)).toEqual(['count', 'count'])
  })

  it('đặt đoạn chuẩn xong thì quay về đo khoảng cách, giữ chiều dài đã nhập khi đặt lại', () => {
    const placed = run({ type: 'mode', mode: 'reference' }, { type: 'point', point: p(0, 0) }, { type: 'point', point: p(100, 0) })
    expect(placed.mode).toBe('distance')
    expect(placed.reference).toEqual({ points: [p(0, 0), p(100, 0)], length: null, unit: 'm' })
    expect(placed.shapes).toEqual([])

    const again = [
      { type: 'reference-length', length: 2.4, unit: 'cm' },
      { type: 'mode', mode: 'reference' },
      { type: 'point', point: p(0, 0) },
      { type: 'point', point: p(0, 50) },
    ].reduce((state, action) => measureReducer(state, action as MeasureAction), placed)
    expect(again.reference).toEqual({ points: [p(0, 0), p(0, 50)], length: 2.4, unit: 'cm' })
  })

  it('đổi thẻ là bỏ hình đang vẽ dở', () => {
    const state = run({ type: 'point', point: p(0, 0) }, { type: 'mode', mode: 'area' })
    expect(state.draft).toEqual([])
  })

  it('hoàn tác: lùi điểm đang vẽ trước, rồi mới tới hình đã xong', () => {
    const state = run({ type: 'point', point: p(0, 0) }, { type: 'point', point: p(10, 0) }, { type: 'point', point: p(5, 5) })
    const first = measureReducer(state, { type: 'undo' })
    expect(first.draft).toEqual([])
    expect(first.shapes).toHaveLength(1)
    expect(measureReducer(first, { type: 'undo' }).shapes).toEqual([])
  })

  it('kéo một đầu đoạn, xoá một hình, xoá hết giữ đoạn chuẩn', () => {
    const base = run(
      { type: 'mode', mode: 'reference' },
      { type: 'point', point: p(0, 0) },
      { type: 'point', point: p(100, 0) },
      { type: 'point', point: p(0, 0) },
      { type: 'point', point: p(10, 0) },
      { type: 'point', point: p(0, 5) },
      { type: 'point', point: p(10, 5) },
    )
    const moved = measureReducer(base, { type: 'move', id: 1, index: 1, point: p(20, 0) })
    expect(moved.shapes[0].points).toEqual([p(0, 0), p(20, 0)])
    expect(measureReducer(moved, { type: 'remove', id: 1 }).shapes.map((shape) => shape.id)).toEqual([2])
    const cleared = measureReducer(moved, { type: 'clear' })
    expect(cleared.shapes).toEqual([])
    expect(cleared.reference).not.toBeNull()
    expect(measureReducer(moved, { type: 'move-reference', index: 0, point: p(50, 0) }).reference?.points).toEqual([p(50, 0), p(100, 0)])
  })
})
