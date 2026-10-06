import type {
  Anchor,
  Axis,
  CompassLayout,
  Divisions,
  NorthReference,
  OrientationTarget,
  Point,
  Size,
  TargetType,
  UxMode,
} from '../types/orientation.types'
import { axisAngle, normalizeDeg, pointAt } from './azimuth'
import { dragRectCorner, INITIAL_TRACE, MIN_POLYGON_POINTS, perpendicularAxis, rectPoints, type TraceShape, type TraceState, type TraceTag, type TraceTool } from './trace'

/** Cách lấy hướng ở bước 2 của luồng đơn giản (spec v1.1 §3). */
export type OrientationMethod = 'DEVICE' | 'MANUAL' | 'DRAWING'

/** Bước đang hướng dẫn trên ảnh — "3 chạm" (spec v1.1 §4). */
export type OrientationStep = 'north' | 'target' | 'door'

export interface OrientationState {
  method: OrientationMethod
  step: OrientationStep
  anchor: Anchor | null
  northReference: NorthReference
  targets: OrientationTarget[]
  activeId: string
  /** null = không có ảnh: la bàn đứng riêng. */
  compass: CompassLayout | null
  divisions: Divisions
  mode: UxMode
  trace: TraceState
  nextId: number
}

export type OrientationAction =
  | { type: 'reset'; size: Size | null }
  | { type: 'method'; method: OrientationMethod }
  | { type: 'step'; step: OrientationStep }
  | { type: 'known-azimuth'; azimuth: number | null; source: 'MANUAL' | 'DEVICE' | 'SURVEY'; accuracy?: number | null }
  | { type: 'place-north'; at: Point; length: number }
  | { type: 'set-north'; axis: Axis; transient?: boolean }
  | { type: 'place-axis'; at: Point; length: number }
  | { type: 'place-door'; at: Point; length: number }
  | { type: 'set-axis'; id: string; axis: Axis; transient?: boolean }
  | { type: 'turn-axis'; id: string; deg: number }
  | { type: 'add-target'; target: TargetType; label?: string }
  | { type: 'rename-target'; id: string; label: string }
  | { type: 'remove-target'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'compass'; patch: Partial<CompassLayout>; transient?: boolean }
  | { type: 'divisions'; divisions: Divisions }
  | { type: 'mode'; mode: UxMode }
  | { type: 'north-reference'; reference: NorthReference }
  | { type: 'trace-tool'; tool: TraceTool | null }
  | { type: 'trace-snap'; snap: boolean }
  | { type: 'trace-point'; point: Point }
  | { type: 'trace-close' }
  | { type: 'trace-cancel' }
  | { type: 'trace-move'; id: string; index: number; point: Point; transient?: boolean }
  | { type: 'trace-delete'; id: string }
  | { type: 'trace-tag'; id: string; tag: TraceTag | null }
  | { type: 'trace-flip'; id: string }

const DEFAULT_REFERENCE: Record<OrientationMethod, NorthReference> = {
  // La bàn điện thoại đọc từ trường — Bắc từ. Số tự nhập thường đọc từ la bàn cầm tay.
  DEVICE: 'MAGNETIC',
  MANUAL: 'MAGNETIC',
  // Mũi tên Bắc trên bản vẽ kiến trúc / sổ đỏ là Bắc thật; chuyên môn tự đổi sang Bắc dự án.
  DRAWING: 'TRUE',
}

export function initialOrientation(size: Size | null): OrientationState {
  // Không có ảnh thì không có bản vẽ để đặt mũi tên Bắc — chỉ còn la bàn máy hoặc số đã biết.
  const method: OrientationMethod = size ? 'DRAWING' : 'DEVICE'
  return {
    method,
    step: size ? 'north' : 'target',
    anchor: null,
    northReference: DEFAULT_REFERENCE[method],
    targets: [{ id: 't1', type: 'HOUSE_FRONTAGE', axis: null }],
    activeId: 't1',
    compass: size ? { center: { x: size.width / 2, y: size.height / 2 }, radius: 0.3, opacity: 0.85 } : null,
    divisions: 8,
    mode: 'HOMEOWNER',
    trace: INITIAL_TRACE,
    nextId: 2,
  }
}

const TAG_TARGET: Record<TraceTag, TargetType> = { FRONTAGE: 'HOUSE_FRONTAGE', ENTRANCE: 'MAIN_DOOR' }

/** Đối tượng mà một nhãn trỏ tới; chưa có thì thêm. */
function ensureTarget(state: OrientationState, type: TargetType): [OrientationState, string] {
  const found = state.targets.find((target) => target.type === type)
  if (found) return [state, found.id]
  const id = `t${state.nextId}`
  return [{ ...state, targets: [...state.targets, { id, type, axis: null }], nextId: state.nextId + 1 }, id]
}

/** Đường đã gắn nhãn sinh lại trục cho đối tượng của nó — kéo tường là trục đi theo. */
function syncTagged(state: OrientationState): OrientationState {
  let next = state
  for (const shape of state.trace.shapes) {
    if (!shape.tag || shape.kind !== 'line') continue
    const axis = perpendicularAxis(shape.points, shape.side)
    if (!axis) continue
    const [withTarget, id] = ensureTarget(next, TAG_TARGET[shape.tag])
    next = updateTarget(withTarget, id, { axis })
  }
  return next
}

function withTrace(state: OrientationState, patch: Partial<TraceState>): OrientationState {
  return { ...state, trace: { ...state.trace, ...patch } }
}

/** Thêm một hình vẽ xong vào danh sách, xoá nét nháp. */
function commitShape(state: OrientationState, kind: TraceTool, points: Point[]): OrientationState {
  const shape: TraceShape = { id: `s${state.nextId}`, kind, points, tag: null, side: 1 }
  return { ...withTrace(state, { shapes: [...state.trace.shapes, shape], draft: [] }), nextId: state.nextId + 1 }
}

function traceReducer(state: OrientationState, action: Extract<OrientationAction, { type: `trace-${string}` }>): OrientationState {
  const { trace } = state
  switch (action.type) {
    case 'trace-tool':
      return withTrace(state, { tool: action.tool, draft: [] })
    case 'trace-snap':
      return withTrace(state, { snap: action.snap })
    case 'trace-point': {
      if (!trace.tool) return state
      const draft = [...trace.draft, action.point]
      if (trace.tool === 'line' && draft.length === 2) return commitShape(state, 'line', draft)
      if (trace.tool === 'rect' && draft.length === 2) return commitShape(state, 'rect', rectPoints(draft[0], draft[1]))
      return withTrace(state, { draft })
    }
    case 'trace-close':
      return trace.tool === 'polygon' && trace.draft.length >= MIN_POLYGON_POINTS ? commitShape(state, 'polygon', trace.draft) : state
    case 'trace-cancel':
      return trace.draft.length === 0 ? state : withTrace(state, { draft: [] })
    case 'trace-move': {
      const shapes = trace.shapes.map((shape) => {
        if (shape.id !== action.id) return shape
        // Khung chữ nhật giữ nguyên là chữ nhật: góc kéo + góc đối diện dựng lại khung.
        if (shape.kind === 'rect') return { ...shape, points: dragRectCorner(shape.points, action.index, action.point) }
        return { ...shape, points: shape.points.map((point, index) => (index === action.index ? action.point : point)) }
      })
      return syncTagged(withTrace(state, { shapes }))
    }
    case 'trace-delete':
      return withTrace(state, { shapes: trace.shapes.filter((shape) => shape.id !== action.id) })
    case 'trace-tag': {
      // Mỗi nhãn chỉ một đường: gắn cho đường mới là gỡ khỏi đường cũ.
      const shapes = trace.shapes.map((shape) => {
        if (shape.id === action.id) return { ...shape, tag: action.tag }
        return action.tag && shape.tag === action.tag ? { ...shape, tag: null } : shape
      })
      return syncTagged(withTrace(state, { shapes }))
    }
    case 'trace-flip': {
      const shapes = trace.shapes.map((shape) => (shape.id === action.id ? { ...shape, side: (shape.side === 1 ? -1 : 1) as 1 | -1 } : shape))
      return syncTagged(withTrace(state, { shapes }))
    }
  }
}

/** Trục dài `length`, tâm tại `at`, quay `deg` (chiều kim đồng hồ từ phía trên ảnh). */
export function axisAround(at: Point, deg: number, length: number): Axis {
  return { from: pointAt(at, deg + 180, length / 2), to: pointAt(at, deg, length / 2) }
}

function middle(axis: Axis): Point {
  return { x: (axis.from.x + axis.to.x) / 2, y: (axis.from.y + axis.to.y) / 2 }
}

function updateTarget(state: OrientationState, id: string, patch: Partial<OrientationTarget>): OrientationState {
  return { ...state, targets: state.targets.map((target) => (target.id === id ? { ...target, ...patch } : target)) }
}

/** Đối tượng mà số độ đã biết đang gắn vào — đổi đối tượng đang chọn KHÔNG được kéo số đó theo. */
function anchorTargetId(state: OrientationState): string {
  return state.anchor && state.anchor.source !== 'DRAWING' ? state.anchor.targetId : state.activeId
}

export function orientationReducer(state: OrientationState, action: OrientationAction): OrientationState {
  switch (action.type) {
    case 'reset':
      return { ...initialOrientation(action.size), mode: state.mode, divisions: state.divisions }
    case 'method': {
      if (action.method === state.method) return state
      // Đổi cách lấy hướng là bỏ mốc cũ: mũi tên Bắc và số độ là hai nguồn khác nhau, không trộn.
      return {
        ...state,
        method: action.method,
        anchor: null,
        northReference: DEFAULT_REFERENCE[action.method],
        step: action.method === 'DRAWING' ? 'north' : 'target',
      }
    }
    case 'step':
      return { ...state, step: action.step }
    case 'known-azimuth': {
      const valid = action.azimuth !== null && Number.isFinite(action.azimuth)
      if (!state.compass) {
        // Không ảnh: mỗi đối tượng một số riêng, gắn vào đối tượng ĐANG CHỌN. Dùng chung một mốc như khi
        // có ảnh thì chốt số cho đối tượng thứ hai sẽ ghi đè số của hướng nhà.
        const id = state.activeId
        const withKnown = updateTarget(state, id, { known: valid ? normalizeDeg(action.azimuth!) : undefined })
        if (!valid) return { ...withKnown, anchor: state.anchor?.source !== 'DRAWING' && state.anchor?.targetId === id ? null : state.anchor }
        return { ...withKnown, anchor: { source: action.source, azimuth: normalizeDeg(action.azimuth!), targetId: id, accuracy: action.accuracy ?? null } }
      }
      if (!valid) return { ...state, anchor: null }
      return {
        ...state,
        anchor: {
          source: action.source,
          azimuth: normalizeDeg(action.azimuth!),
          targetId: anchorTargetId(state),
          accuracy: action.accuracy ?? null,
        },
      }
    }
    case 'place-north': {
      const angle = state.anchor?.source === 'DRAWING' ? (axisAngle(state.anchor.northAxis) ?? 0) : 0
      return { ...state, anchor: { source: 'DRAWING', northAxis: axisAround(action.at, angle, action.length) }, step: 'target' }
    }
    case 'set-north':
      return { ...state, anchor: { source: 'DRAWING', northAxis: action.axis } }
    case 'place-axis': {
      const target = state.targets.find((item) => item.id === state.activeId)
      if (!target) return state
      // Đặt lại chỗ khác thì giữ hướng đã xoay; lần đầu chĩa xuống — mặt tiền của bản vẽ thường ở mép dưới.
      const angle = target.axis ? (axisAngle(target.axis) ?? 180) : 180
      return updateTarget(state, target.id, { axis: axisAround(action.at, angle, action.length) })
    }
    case 'place-door': {
      // Một chạm = một bước hoàn tác: thêm (hoặc chọn) cửa chính rồi đặt trục luôn.
      const [withDoor, id] = ensureTarget(state, 'MAIN_DOOR')
      return orientationReducer({ ...withDoor, activeId: id, step: 'door' }, { type: 'place-axis', at: action.at, length: action.length })
    }
    case 'set-axis':
      return updateTarget(state, action.id, { axis: action.axis })
    case 'turn-axis': {
      const target = state.targets.find((item) => item.id === action.id)
      if (!target?.axis) return state
      const length = Math.hypot(target.axis.to.x - target.axis.from.x, target.axis.to.y - target.axis.from.y)
      return updateTarget(state, target.id, { axis: axisAround(middle(target.axis), normalizeDeg(action.deg), length) })
    }
    case 'add-target': {
      const id = `t${state.nextId}`
      const target: OrientationTarget = { id, type: action.target, axis: null, label: action.label }
      return { ...state, targets: [...state.targets, target], activeId: id, nextId: state.nextId + 1, step: 'target' }
    }
    case 'rename-target':
      return updateTarget(state, action.id, { label: action.label })
    case 'remove-target': {
      if (state.targets.length <= 1) return state
      const targets = state.targets.filter((target) => target.id !== action.id)
      // Bỏ đúng đối tượng đang mang số độ đã biết thì mốc mất theo — không để số độ treo vào đối tượng khác.
      const anchor = state.anchor && state.anchor.source !== 'DRAWING' && state.anchor.targetId === action.id ? null : state.anchor
      return { ...state, targets, anchor, activeId: state.activeId === action.id ? targets[0].id : state.activeId }
    }
    case 'activate':
      return { ...state, activeId: action.id }
    case 'compass':
      return state.compass ? { ...state, compass: { ...state.compass, ...action.patch } } : state
    case 'divisions':
      return { ...state, divisions: action.divisions }
    case 'mode':
      return { ...state, mode: action.mode }
    case 'north-reference':
      return { ...state, northReference: action.reference }
    default:
      return traceReducer(state, action)
  }
}

const VIEW_ONLY = new Set<OrientationAction['type']>(['step', 'activate', 'divisions', 'mode', 'trace-tool', 'trace-snap'])

/**
 * Không ghi vào ngăn hoàn tác: bước kéo (mỗi lần di chuột một hành động — đã có
 * `checkpoint` lúc bắt đầu kéo) và thao tác chỉ đổi cách xem.
 */
export function isUntracked(action: OrientationAction): boolean {
  return VIEW_ONLY.has(action.type) || ('transient' in action && action.transient === true)
}
