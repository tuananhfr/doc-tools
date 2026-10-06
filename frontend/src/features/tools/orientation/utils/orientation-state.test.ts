import { describe, expect, it } from 'vitest'
import { targetAzimuth } from './azimuth'
import { compassShapes } from './compass-geometry'
import { startHistory, withHistory } from './history'
import { initialOrientation, isUntracked, orientationReducer, type OrientationAction, type OrientationState } from './orientation-state'

const reduce = (actions: OrientationAction[], state = initialOrientation({ width: 1000, height: 800 })) => actions.reduce(orientationReducer, state)
const active = (state: OrientationState) => state.targets.find((target) => target.id === state.activeId)!

describe('orientationReducer', () => {
  it('không ảnh: mặc định đo bằng la bàn máy, Bắc từ', () => {
    const state = initialOrientation(null)
    expect(state.method).toBe('DEVICE')
    expect(state.step).toBe('target')
    expect(state.northReference).toBe('MAGNETIC')
  })

  it('chạm bước "Cửa chính": thêm cửa + đặt trục trong MỘT bước hoàn tác', () => {
    const start = reduce([{ type: 'place-north', at: { x: 100, y: 100 }, length: 80 }])
    const placed = orientationReducer(start, { type: 'place-door', at: { x: 300, y: 300 }, length: 100 })
    const door = active(placed)
    expect(door.type).toBe('MAIN_DOOR')
    expect(door.axis).not.toBeNull()
    expect(placed.step).toBe('door')
    // Chạm lần nữa: dời trục của CHÍNH cửa đó, không thêm cửa thứ hai.
    const again = orientationReducer(placed, { type: 'place-door', at: { x: 500, y: 300 }, length: 100 })
    expect(again.targets.filter((target) => target.type === 'MAIN_DOOR')).toHaveLength(1)
    expect(isUntracked({ type: 'place-door', at: { x: 0, y: 0 }, length: 1 })).toBe(false)
  })

  it('3 chạm: Bắc → mặt tiền → ra số độ', () => {
    const state = reduce([
      { type: 'place-north', at: { x: 100, y: 100 }, length: 80 },
      { type: 'place-axis', at: { x: 500, y: 700 }, length: 120 },
    ])
    expect(state.step).toBe('target')
    // Bắc mặc định chĩa lên ảnh, mặt tiền mặc định chĩa xuống → Nam.
    expect(targetAzimuth(active(state), state.anchor, state.targets)).toBe(180)
    const turned = orientationReducer(state, { type: 'turn-axis', id: 't1', deg: 132 })
    expect(targetAzimuth(active(turned), turned.anchor, turned.targets)).toBeCloseTo(132, 9)
  })

  it('đặt lại Bắc chỗ khác giữ nguyên hướng đã xoay', () => {
    let state = reduce([{ type: 'place-north', at: { x: 100, y: 100 }, length: 80 }])
    state = orientationReducer(state, { type: 'set-north', axis: { from: { x: 100, y: 100 }, to: { x: 140, y: 100 } } })
    state = orientationReducer(state, { type: 'place-north', at: { x: 600, y: 400 }, length: 80 })
    expect(state.anchor?.source).toBe('DRAWING')
    if (state.anchor?.source !== 'DRAWING') return
    const { from, to } = state.anchor.northAxis
    expect(to.x - from.x).toBeCloseTo(80, 6)
    expect(to.y - from.y).toBeCloseTo(0, 6)
  })

  it('số độ tự nhập gắn vào đối tượng đang chọn, đổi chọn không kéo số theo', () => {
    let state = reduce([{ type: 'method', method: 'MANUAL' }, { type: 'known-azimuth', azimuth: -10, source: 'MANUAL' }])
    expect(state.anchor).toMatchObject({ source: 'MANUAL', azimuth: 350, targetId: 't1' })
    expect(state.northReference).toBe('MAGNETIC')
    state = orientationReducer(state, { type: 'add-target', target: 'MAIN_DOOR' })
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: 90, source: 'MANUAL' })
    expect(state.anchor).toMatchObject({ targetId: 't1', azimuth: 90 })
  })

  it('không ảnh: chốt số cho đối tượng thứ hai không ghi đè hướng nhà', () => {
    let state = initialOrientation(null)
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: 178.4, source: 'DEVICE', accuracy: 10 })
    state = orientationReducer(state, { type: 'add-target', target: 'KITCHEN' })
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: 90, source: 'MANUAL' })
    const value = (id: string) => targetAzimuth(state.targets.find((target) => target.id === id)!, state.anchor, state.targets)
    expect(value('t1')).toBeCloseTo(178.4, 9)
    expect(value('t2')).toBe(90)
    // Xoá số của bếp chỉ xoá số của bếp.
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: null, source: 'MANUAL' })
    expect(value('t2')).toBeNull()
    expect(value('t1')).toBeCloseTo(178.4, 9)
  })

  it('kéo góc khung qua cạnh đối diện: góc đối diện đứng yên, khung không sụp', () => {
    let state = reduce([{ type: 'trace-tool', tool: 'rect' }, { type: 'trace-point', point: { x: 10, y: 20 } }, { type: 'trace-point', point: { x: 50, y: 60 } }])
    const id = state.trace.shapes[0].id
    // Kéo đỉnh 0 (10,20) vượt qua đỉnh 2 (50,60), từng bước như khi rê chuột.
    for (const point of [{ x: 40, y: 50 }, { x: 70, y: 80 }, { x: 90, y: 100 }]) {
      state = orientationReducer(state, { type: 'trace-move', id, index: 0, point, transient: true })
    }
    const points = state.trace.shapes[0].points
    expect(points[0]).toEqual({ x: 90, y: 100 })
    expect(points[2]).toEqual({ x: 50, y: 60 })
    expect(new Set(points.map((point) => `${point.x},${point.y}`)).size).toBe(4)
  })

  it('đổi cách lấy hướng là bỏ mốc cũ', () => {
    const state = reduce([{ type: 'place-north', at: { x: 1, y: 1 }, length: 10 }, { type: 'method', method: 'MANUAL' }])
    expect(state.anchor).toBeNull()
    expect(state.step).toBe('target')
  })

  it('bỏ đối tượng đang mang số độ thì mốc mất theo; không bỏ được đối tượng cuối', () => {
    let state = reduce([{ type: 'method', method: 'MANUAL' }, { type: 'add-target', target: 'BED' }, { type: 'activate', id: 't1' }])
    state = orientationReducer(state, { type: 'known-azimuth', azimuth: 40, source: 'MANUAL' })
    state = orientationReducer(state, { type: 'remove-target', id: 't1' })
    expect(state.anchor).toBeNull()
    expect(state.activeId).toBe('t2')
    expect(orientationReducer(state, { type: 'remove-target', id: 't2' })).toBe(state)
  })

  it('không có ảnh thì không có la bàn đặt trên ảnh', () => {
    expect(initialOrientation(null).compass).toBeNull()
    expect(orientationReducer(initialOrientation(null), { type: 'compass', patch: { opacity: 0.5 } }).compass).toBeNull()
  })
})

describe('withHistory', () => {
  const reducer = withHistory(orientationReducer, isUntracked)
  const start = startHistory(initialOrientation({ width: 1000, height: 800 }))

  it('hoàn tác / làm lại mọi bước, kéo chỉ chiếm một bước', () => {
    let history = reducer(start, { type: 'do', action: { type: 'place-north', at: { x: 1, y: 1 }, length: 10 } })
    history = reducer(history, { type: 'checkpoint' })
    for (let index = 0; index < 20; index++) {
      history = reducer(history, { type: 'do', action: { type: 'set-north', axis: { from: { x: 0, y: 0 }, to: { x: index + 1, y: 0 } }, transient: true } })
    }
    expect(history.past).toHaveLength(2)
    history = reducer(history, { type: 'undo' })
    expect(history.present.anchor).toMatchObject({ source: 'DRAWING' })
    history = reducer(history, { type: 'undo' })
    expect(history.present.anchor).toBeNull()
    history = reducer(history, { type: 'redo' })
    expect(history.present.anchor?.source).toBe('DRAWING')
  })

  it('đổi cách xem không vào ngăn hoàn tác', () => {
    const history = reducer(start, { type: 'do', action: { type: 'divisions', divisions: 16 } })
    expect(history.past).toHaveLength(0)
    expect(history.present.divisions).toBe(16)
  })
})

describe('compassShapes', () => {
  it('kim của đối tượng nằm đúng góc so với Bắc trên mặt vẽ', () => {
    const shapes = compassShapes({
      center: { x: 0, y: 0 },
      radius: 100,
      north: 90,
      divisions: 8,
      degrees: false,
      needles: [{ azimuth: 90, label: 'Nhà', active: true }],
    })
    const needle = shapes.find((shape) => shape.kind === 'line' && shape.role === 'target-active')
    // Bắc chĩa sang phải ảnh, đối tượng hướng Đông → chĩa xuống ảnh.
    expect(needle?.kind === 'line' && needle.to.x).toBeCloseTo(0, 6)
    expect(needle?.kind === 'line' && needle.to.y).toBeCloseTo(96, 6)
    expect(shapes.filter((shape) => shape.kind === 'line' && shape.role === 'sector')).toHaveLength(8)
  })

  it('lớp số độ chỉ có ở chế độ chuyên môn', () => {
    const base = { center: { x: 0, y: 0 }, radius: 100, north: 0, divisions: 16 as const, needles: [] }
    expect(compassShapes({ ...base, degrees: false }).some((shape) => shape.role === 'tick')).toBe(false)
    expect(compassShapes({ ...base, degrees: true }).filter((shape) => shape.role === 'tick' || shape.role === 'tick-major')).toHaveLength(72)
  })
})

describe('Trace Assist — ORI-005', () => {
  const draw = (actions: OrientationAction[]) => reduce([{ type: 'trace-tool', tool: 'line' }, ...actions])

  it('đường 2 điểm, khung 2 góc, đa giác khép bằng điểm đầu', () => {
    let state = draw([{ type: 'trace-point', point: { x: 0, y: 0 } }, { type: 'trace-point', point: { x: 100, y: 0 } }])
    expect(state.trace.shapes).toHaveLength(1)
    state = orientationReducer(state, { type: 'trace-tool', tool: 'rect' })
    state = [{ x: 50, y: 60 }, { x: 10, y: 20 }].reduce((current, point) => orientationReducer(current, { type: 'trace-point', point }), state)
    expect(state.trace.shapes[1].points).toEqual([{ x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 60 }, { x: 10, y: 60 }])
    state = orientationReducer(state, { type: 'trace-tool', tool: 'polygon' })
    state = [{ x: 0, y: 0 }, { x: 10, y: 0 }].reduce((current, point) => orientationReducer(current, { type: 'trace-point', point }), state)
    expect(orientationReducer(state, { type: 'trace-close' })).toBe(state)
    state = orientationReducer(orientationReducer(state, { type: 'trace-point', point: { x: 10, y: 10 } }), { type: 'trace-close' })
    expect(state.trace.shapes).toHaveLength(3)
    expect(state.trace.draft).toEqual([])
  })

  it('gắn nhãn mặt tiền sinh trục hướng nhà vuông góc với tường, kéo tường thì trục theo, lật được', () => {
    let state = draw([{ type: 'trace-point', point: { x: 0, y: 500 } }, { type: 'trace-point', point: { x: 200, y: 500 } }])
    const id = state.trace.shapes[0].id
    state = orientationReducer(state, { type: 'trace-tag', id, tag: 'FRONTAGE' })
    state = orientationReducer(state, { type: 'place-north', at: { x: 50, y: 50 }, length: 40 })
    const front = () => state.targets.find((target) => target.type === 'HOUSE_FRONTAGE')!
    // Tường vẽ từ trái sang phải, bên trái chiều vẽ là phía trên ảnh → Bắc.
    expect(targetAzimuth(front(), state.anchor, state.targets)).toBeCloseTo(0, 6)
    state = orientationReducer(state, { type: 'trace-flip', id })
    expect(targetAzimuth(front(), state.anchor, state.targets)).toBeCloseTo(180, 6)
    state = orientationReducer(state, { type: 'trace-move', id, index: 1, point: { x: 0, y: 300 } })
    // Tường giờ dựng đứng từ dưới lên, phía bên phải chiều vẽ là Đông.
    expect(targetAzimuth(front(), state.anchor, state.targets)).toBeCloseTo(90, 6)
  })

  it('cửa chính chưa có thì gắn nhãn sẽ thêm; mỗi nhãn chỉ một đường', () => {
    let state = draw([
      { type: 'trace-point', point: { x: 0, y: 0 } },
      { type: 'trace-point', point: { x: 10, y: 0 } },
      { type: 'trace-point', point: { x: 0, y: 50 } },
      { type: 'trace-point', point: { x: 10, y: 50 } },
    ])
    const [first, second] = state.trace.shapes
    state = orientationReducer(state, { type: 'trace-tag', id: first.id, tag: 'ENTRANCE' })
    expect(state.targets.some((target) => target.type === 'MAIN_DOOR' && target.axis)).toBe(true)
    state = orientationReducer(state, { type: 'trace-tag', id: second.id, tag: 'ENTRANCE' })
    expect(state.trace.shapes.map((shape) => shape.tag)).toEqual([null, 'ENTRANCE'])
  })
})
