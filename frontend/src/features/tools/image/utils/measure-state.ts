import type { Point } from '../types/image.types'
import type { LengthUnit, MeasureMode, MeasureShape, MeasureState } from '../types/measure.types'

export const INITIAL_MEASURE: MeasureState = { mode: 'distance', shapes: [], draft: [], reference: null, nextId: 1 }

export type MeasureAction =
  | { type: 'mode'; mode: MeasureMode }
  | { type: 'point'; point: Point }
  /** Khép vùng đang vẽ thành một đa giác. */
  | { type: 'close' }
  | { type: 'move'; id: number; index: number; point: Point }
  | { type: 'move-reference'; index: 0 | 1; point: Point }
  | { type: 'reference-length'; length: number | null; unit: LengthUnit }
  | { type: 'clear-reference' }
  | { type: 'remove'; id: number }
  | { type: 'undo' }
  | { type: 'clear' }

/** Số đỉnh ít nhất để khép được một vùng. */
export const MIN_AREA_POINTS = 3

function addShape(state: MeasureState, shape: MeasureShape): MeasureState {
  return { ...state, shapes: [...state.shapes, shape], draft: [], nextId: state.nextId + 1 }
}

function addPoint(state: MeasureState, point: Point): MeasureState {
  if (state.mode === 'count') return addShape(state, { id: state.nextId, kind: 'count', points: [point] })
  if (state.mode === 'area') return { ...state, draft: [...state.draft, point] }
  if (state.draft.length === 0) return { ...state, draft: [point] }

  const points: [Point, Point] = [state.draft[0], point]
  if (state.mode === 'distance') return addShape(state, { id: state.nextId, kind: 'distance', points })
  // Đặt xong đoạn chuẩn thì quay về đo: người dùng đặt đoạn chuẩn là để đo, không phải để đặt tiếp.
  return {
    ...state,
    mode: 'distance',
    draft: [],
    reference: { points, length: state.reference?.length ?? null, unit: state.reference?.unit ?? 'm' },
  }
}

export function measureReducer(state: MeasureState, action: MeasureAction): MeasureState {
  switch (action.type) {
    case 'mode':
      return action.mode === state.mode ? state : { ...state, mode: action.mode, draft: [] }
    case 'point':
      return addPoint(state, action.point)
    case 'close':
      if (state.mode !== 'area' || state.draft.length < MIN_AREA_POINTS) return state
      return addShape(state, { id: state.nextId, kind: 'area', points: state.draft })
    case 'move':
      return {
        ...state,
        shapes: state.shapes.map((shape) =>
          shape.id === action.id ? ({ ...shape, points: shape.points.map((point, index) => (index === action.index ? action.point : point)) } as MeasureShape) : shape,
        ),
      }
    case 'move-reference': {
      if (!state.reference) return state
      const points: [Point, Point] = [state.reference.points[0], state.reference.points[1]]
      points[action.index] = action.point
      return { ...state, reference: { ...state.reference, points } }
    }
    case 'reference-length':
      return state.reference ? { ...state, reference: { ...state.reference, length: action.length, unit: action.unit } } : state
    case 'clear-reference':
      return { ...state, reference: null, mode: state.mode === 'reference' ? 'distance' : state.mode, draft: state.mode === 'reference' ? [] : state.draft }
    case 'remove':
      return { ...state, shapes: state.shapes.filter((shape) => shape.id !== action.id) }
    case 'undo':
      // Đang vẽ dở thì lùi một điểm; không thì bỏ hình vừa vẽ xong.
      if (state.draft.length > 0) return { ...state, draft: state.draft.slice(0, -1) }
      return state.shapes.length > 0 ? { ...state, shapes: state.shapes.slice(0, -1) } : state
    case 'clear':
      return { ...state, shapes: [], draft: [] }
  }
}
