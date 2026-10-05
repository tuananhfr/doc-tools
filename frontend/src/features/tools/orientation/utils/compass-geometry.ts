import type { Divisions, Point } from '../types/orientation.types'
import { directionNames, pointAt } from './azimuth'

/** Vai trò quyết định màu — màu thật lấy từ token của theme lúc vẽ, ở đây không chọn màu. */
export type CompassRole =
  | 'disc'
  | 'ring'
  | 'tick'
  | 'tick-major'
  | 'sector'
  | 'label'
  | 'label-north'
  | 'north'
  | 'target'
  | 'target-active'
  | 'sun'
  | 'trace'
  | 'trace-tag'
  | 'draft'

export type CompassShape =
  | { kind: 'circle'; center: Point; radius: number; role: CompassRole; width: number; fill?: boolean }
  | { kind: 'line'; from: Point; to: Point; role: CompassRole; width: number; dash?: number[] }
  | { kind: 'polygon'; points: Point[]; role: CompassRole }
  /** Đường gấp khúc có viền sáng bên dưới — nét vẽ tay và trục đè lên ảnh phải đọc được trên mọi nền. */
  | { kind: 'path'; points: Point[]; closed: boolean; role: CompassRole; width: number; fill?: boolean; dash?: number[] }
  | { kind: 'text'; at: Point; text: string; role: CompassRole; size: number; weight: 400 | 600 | 700 }

export interface CompassNeedle {
  azimuth: number
  label: string
  active: boolean
}

export interface CompassSpec {
  center: Point
  /** Bán kính theo đơn vị của mặt vẽ (điểm ảnh của ảnh, hoặc điểm của khung la bàn đứng riêng). */
  radius: number
  /** Hướng Bắc nằm ở góc nào của mặt vẽ (chiều kim đồng hồ từ phía trên). */
  north: number
  divisions: Divisions
  /** Vạch từng 5° + số độ mỗi 30° — lớp của chế độ chuyên môn. */
  degrees: boolean
  needles: CompassNeedle[]
  /** Hướng mặt trời (độ, so với Bắc) — đợt sau mới có; null = không vẽ. */
  sun?: number | null
}

/**
 * Dựng la bàn thành danh sách hình đơn giản. Bản xem trên màn hình (SVG) và ảnh
 * xuất (canvas) vẽ CÙNG một danh sách — hai bản không thể lệch nhau dù đổi cỡ.
 * Chữ luôn đứng thẳng (không xoay theo la bàn) để đọc được ở mọi góc.
 */
export function compassShapes(spec: CompassSpec): CompassShape[] {
  const { center, radius, north } = spec
  const unit = radius / 120
  const at = (deg: number, fraction: number) => pointAt(center, north + deg, radius * fraction)
  const shapes: CompassShape[] = [
    { kind: 'circle', center, radius, role: 'disc', width: 0, fill: true },
    { kind: 'circle', center, radius, role: 'ring', width: 2 * unit },
    { kind: 'circle', center, radius: radius * 0.62, role: 'ring', width: 1.2 * unit },
  ]

  // Ranh giới cung: hướng nằm GIỮA cung, ranh giới lệch nửa cung.
  const width = 360 / spec.divisions
  for (let index = 0; index < spec.divisions; index++) {
    const edge = index * width + width / 2
    shapes.push({ kind: 'line', from: at(edge, 0.62), to: at(edge, 1), role: 'sector', width: unit, dash: [3 * unit, 3 * unit] })
  }

  if (spec.degrees) {
    for (let deg = 0; deg < 360; deg += 5) {
      const major = deg % 30 === 0
      shapes.push({ kind: 'line', from: at(deg, major ? 0.9 : 0.94), to: at(deg, 1), role: major ? 'tick-major' : 'tick', width: (major ? 1.6 : 1) * unit })
      if (major && deg % 90 !== 0) shapes.push({ kind: 'text', at: at(deg, 0.83), text: String(deg), role: 'label', size: 9 * unit, weight: 400 })
    }
  }

  // Tên hướng: 8 cung ghi tắt ở vòng trong; 16 cung chỉ ghi 8 hướng chính để chữ không chồng nhau.
  directionNames(8).forEach(([, short], index) => {
    const main = index % 2 === 0
    shapes.push({
      kind: 'text',
      at: at(index * 45, spec.degrees ? 0.7 : 0.8),
      text: short,
      role: index === 0 ? 'label-north' : 'label',
      size: (main ? 15 : 11) * unit,
      weight: main ? 700 : 600,
    })
  })

  // Kim Bắc: tam giác mảnh từ tâm.
  shapes.push({ kind: 'polygon', points: [at(0, 0.55), at(90, 0.06), at(-90, 0.06)], role: 'north' })

  if (spec.sun !== undefined && spec.sun !== null) {
    shapes.push({ kind: 'line', from: at(spec.sun, 0.62), to: at(spec.sun, 1.08), role: 'sun', width: 2 * unit, dash: [4 * unit, 3 * unit] })
    shapes.push({ kind: 'circle', center: at(spec.sun, 1.12), radius: 6 * unit, role: 'sun', width: 0, fill: true })
  }

  // Đối tượng đang chọn vẽ sau cùng để nằm trên.
  const needles = [...spec.needles].sort((a, b) => Number(a.active) - Number(b.active))
  for (const needle of needles) {
    const role: CompassRole = needle.active ? 'target-active' : 'target'
    const end = at(needle.azimuth, 0.96)
    shapes.push({ kind: 'line', from: center, to: end, role, width: (needle.active ? 3.2 : 2) * unit })
    shapes.push({ kind: 'circle', center: end, radius: (needle.active ? 5 : 3.5) * unit, role, width: 0, fill: true })
    shapes.push({ kind: 'text', at: at(needle.azimuth, 1.16), text: needle.label, role, size: 11 * unit, weight: 700 })
  }

  shapes.push({ kind: 'circle', center, radius: 3 * unit, role: 'ring', width: 0, fill: true })
  return shapes
}

/** Phóng cả danh sách hình sang mặt vẽ to / nhỏ hơn (ảnh xuất ở độ phân giải khác bản xem). */
export function scaleShapes(shapes: CompassShape[], factor: number): CompassShape[] {
  if (factor === 1) return shapes
  const point = (value: Point): Point => ({ x: value.x * factor, y: value.y * factor })
  const dash = (value?: number[]) => value?.map((item) => item * factor)
  return shapes.map((shape) => {
    switch (shape.kind) {
      case 'circle':
        return { ...shape, center: point(shape.center), radius: shape.radius * factor, width: shape.width * factor }
      case 'line':
        return { ...shape, from: point(shape.from), to: point(shape.to), width: shape.width * factor, dash: dash(shape.dash) }
      case 'polygon':
        return { ...shape, points: shape.points.map(point) }
      case 'path':
        return { ...shape, points: shape.points.map(point), width: shape.width * factor, dash: dash(shape.dash) }
      case 'text':
        return { ...shape, at: point(shape.at), size: shape.size * factor }
    }
  })
}
