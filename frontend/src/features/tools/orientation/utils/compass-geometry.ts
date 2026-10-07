import { MOUNTAINS, TRIGRAM_BY_SECTOR } from '../config/luopan'
import type { Divisions, Point } from '../types/orientation.types'
import { intlLocale } from '@/i18n/intl'
import { directionNames, normalizeDeg, pointAt } from './azimuth'
import { mountainName, trigramName } from './terms'

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
  | 'star-good'
  | 'star-bad'
  | 'star-good-text'
  | 'star-bad-text'
  | 'mountain'
  | 'trigram'

export type CompassShape =
  | { kind: 'circle'; center: Point; radius: number; role: CompassRole; width: number; fill?: boolean }
  | { kind: 'line'; from: Point; to: Point; role: CompassRole; width: number; dash?: number[] }
  | { kind: 'polygon'; points: Point[]; role: CompassRole }
  /** Đường gấp khúc có viền sáng bên dưới — nét vẽ tay và trục đè lên ảnh phải đọc được trên mọi nền. */
  | { kind: 'path'; points: Point[]; closed: boolean; role: CompassRole; width: number; fill?: boolean; dash?: number[] }
  /** `rotate` (độ, chiều kim đồng hồ) cho chữ chạy theo vòng; `halo: false` cho chữ nằm trên nền tô màu. */
  | { kind: 'text'; at: Point; text: string; role: CompassRole; size: number; weight: 400 | 600 | 700; rotate?: number; halo?: false }
  /** Hình quạt vành khuyên; góc theo mặt vẽ (chiều kim đồng hồ từ phía trên), `end` > `start`. */
  | { kind: 'arc'; center: Point; inner: number; outer: number; start: number; end: number; role: CompassRole }

export interface CompassNeedle {
  azimuth: number
  label: string
  active: boolean
}

/** Một cung của vòng sao theo tuổi, theo thứ tự hướng (0 = Bắc). */
export interface StarSegment {
  label: string
  good: boolean
}

/** Các vòng của mặt la kinh (chế độ Gia chủ). */
export interface CompassRings {
  /** 8 sao của gia chủ; null = chưa nhập tuổi, không vẽ vòng sao. */
  stars: StarSegment[] | null
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
  /** Có = vẽ mặt la kinh (vòng độ, sao, 24 sơn, 8 hướng, quái) thay cho la bàn kỹ thuật. */
  rings?: CompassRings | null
}

/**
 * Dựng la bàn thành danh sách hình đơn giản. Bản xem trên màn hình (SVG) và ảnh
 * xuất (canvas) vẽ CÙNG một danh sách — hai bản không thể lệch nhau dù đổi cỡ.
 * La bàn kỹ thuật giữ chữ đứng thẳng để đọc ở mọi góc; mặt la kinh xoay chữ theo vòng như la kinh thật.
 */
export function compassShapes(spec: CompassSpec): CompassShape[] {
  if (spec.rings) return luopanShapes(spec, spec.rings)
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
  directionNames(8).forEach(({ short }, index) => {
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

  shapes.push(...needleShapes(spec, at, unit))
  shapes.push({ kind: 'circle', center, radius: 3 * unit, role: 'ring', width: 0, fill: true })
  return shapes
}

function needleShapes(spec: CompassSpec, at: (deg: number, fraction: number) => Point, unit: number): CompassShape[] {
  const shapes: CompassShape[] = []
  if (spec.sun !== undefined && spec.sun !== null) {
    shapes.push({ kind: 'line', from: at(spec.sun, 0.62), to: at(spec.sun, 1.08), role: 'sun', width: 2 * unit, dash: [4 * unit, 3 * unit] })
    shapes.push({ kind: 'circle', center: at(spec.sun, 1.12), radius: 6 * unit, role: 'sun', width: 0, fill: true })
  }
  // Đối tượng đang chọn vẽ sau cùng để nằm trên.
  for (const needle of [...spec.needles].sort((a, b) => Number(a.active) - Number(b.active))) {
    const role: CompassRole = needle.active ? 'target-active' : 'target'
    const end = at(needle.azimuth, 0.96)
    shapes.push({ kind: 'line', from: spec.center, to: end, role, width: (needle.active ? 3.2 : 2) * unit })
    shapes.push({ kind: 'circle', center: end, radius: (needle.active ? 5 : 3.5) * unit, role, width: 0, fill: true })
    shapes.push({ kind: 'text', at: at(needle.azimuth, 1.16), text: needle.label, role, size: 11 * unit, weight: 700 })
  }
  return shapes
}

type Band = 'stars' | 'mountains' | 'directions' | 'trigrams'

/** Độ dày tương đối của từng vòng — vòng sao và 24 sơn cần chỗ cho chữ nhất. */
const BAND_WEIGHT: Record<Band, number> = { stars: 1.15, mountains: 1, directions: 1, trigrams: 0.85 }
/** Vòng độ chiếm mép ngoài; tâm chừa trống để không chen chữ. */
const DEGREE_BAND = 0.86
const CORE = 0.24
/** Bề rộng trung bình một ký tự / cỡ chữ của font giao diện có dấu (đo trên "Nhâm"), cộng chút dư. */
const GLYPH_WIDTH = 0.78

/**
 * Mặt la kinh như la bàn phong thuỷ: từ ngoài vào là vòng độ, vòng sao theo tuổi
 * (khi có), 24 sơn, 8 hướng, 8 quái hậu thiên. Chữ chạy theo vòng — chữ ở nửa dưới
 * lộn ngược, đúng như la kinh thật; mặt số xoay theo máy nên phía đang đọc luôn ở trên.
 */
function luopanShapes(spec: CompassSpec, rings: CompassRings): CompassShape[] {
  const { center, radius, north } = spec
  const unit = radius / 120
  const at = (deg: number, fraction: number) => pointAt(center, north + deg, radius * fraction)
  const turn = (deg: number) => normalizeDeg(north + deg)
  const shapes: CompassShape[] = [
    { kind: 'circle', center, radius, role: 'disc', width: 0, fill: true },
    { kind: 'circle', center, radius, role: 'ring', width: 2 * unit },
  ]

  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 30 === 0
    shapes.push({ kind: 'line', from: at(deg, major ? 0.93 : 0.96), to: at(deg, 1), role: major ? 'tick-major' : 'tick', width: (major ? 1.4 : 0.8) * unit })
    if (major) shapes.push({ kind: 'text', at: at(deg, 0.895), text: String(deg), role: 'label', size: 6.5 * unit, weight: 600, rotate: turn(deg), halo: false })
  }
  // Mốc Bắc ở mép ngoài: nhìn là biết mặt số đang xoay về đâu.
  shapes.push({ kind: 'polygon', points: [at(0, 1.07), at(2.6, 0.995), at(-2.6, 0.995)], role: 'north' })

  const bands: Band[] = [...(rings.stars ? (['stars'] as const) : []), 'mountains', 'directions', 'trigrams']
  const total = bands.reduce((sum, band) => sum + BAND_WEIGHT[band], 0)
  let outer = DEGREE_BAND
  shapes.push({ kind: 'circle', center, radius: radius * outer, role: 'ring', width: 1.2 * unit })

  for (const band of bands) {
    const inner = outer - ((DEGREE_BAND - CORE) * BAND_WEIGHT[band]) / total
    const middle = (outer + inner) / 2
    const thickness = (outer - inner) * radius

    if (band === 'stars' && rings.stars) {
      rings.stars.forEach((star, index) => {
        const deg = index * 45
        // Không chuẩn hoá về [0, 360): ô Bắc sẽ thành 337,5° → 22,5° và quét ngược.
        const start = north + deg - 22.5
        shapes.push({ kind: 'arc', center, inner: radius * inner, outer: radius * outer, start, end: start + 45, role: star.good ? 'star-good' : 'star-bad' })
        shapes.push({
          kind: 'text',
          at: at(deg, middle),
          text: star.label.toLocaleUpperCase(intlLocale()),
          role: star.good ? 'star-good-text' : 'star-bad-text',
          size: Math.min(thickness * 0.4, 11 * unit),
          weight: 700,
          rotate: turn(deg),
          halo: false,
        })
      })
      // Vạch nền giữa các ô sao — hai ô cùng màu đứng cạnh nhau vẫn tách được.
      for (let index = 0; index < 8; index++) {
        shapes.push({ kind: 'line', from: at(index * 45 + 22.5, inner), to: at(index * 45 + 22.5, outer), role: 'disc', width: 1.6 * unit })
      }
    }

    if (band === 'mountains') {
      // Chữ chạy theo cung: tên dài nhất phải vừa một ô 15°, giới hạn theo độ dày vòng thôi thì "Khôn" chồng lên "Thân".
      const cell = (2 * Math.PI * radius * middle) / MOUNTAINS.length
      const names = MOUNTAINS.map((mountain) => mountainName(mountain.index))
      const longest = Math.max(...names.map((name) => name.length))
      const mountainSize = Math.min(thickness * 0.36, 8.5 * unit, cell / (longest * GLYPH_WIDTH))
      for (const mountain of MOUNTAINS) {
        const edge = mountain.center + 7.5
        // Ranh giữa hai hướng đậm hơn ranh giữa hai sơn trong một hướng.
        const sectorEdge = (edge - 22.5) % 45 === 0
        shapes.push({ kind: 'line', from: at(edge, inner), to: at(edge, outer), role: sectorEdge ? 'tick-major' : 'sector', width: (sectorEdge ? 1.2 : 0.7) * unit })
        shapes.push({ kind: 'text', at: at(mountain.center, middle), text: names[mountain.index], role: 'mountain', size: mountainSize, weight: 600, rotate: turn(mountain.center), halo: false })
      }
    }

    if (band === 'directions') {
      directionNames(8).forEach(({ name }, index) => {
        shapes.push({
          kind: 'text',
          at: at(index * 45, middle),
          text: name.toLocaleUpperCase(intlLocale()),
          role: index === 0 ? 'label-north' : 'label',
          size: Math.min(thickness * 0.34, 9 * unit),
          weight: 700,
          rotate: turn(index * 45),
          halo: false,
        })
      })
    }

    if (band === 'trigrams') {
      TRIGRAM_BY_SECTOR.forEach((id, index) => {
        shapes.push({ kind: 'text', at: at(index * 45, middle), text: trigramName(id), role: 'trigram', size: Math.min(thickness * 0.36, 8 * unit), weight: 600, rotate: turn(index * 45), halo: false })
      })
    }

    shapes.push({ kind: 'circle', center, radius: radius * inner, role: 'ring', width: unit })
    outer = inner
  }

  shapes.push(...needleShapes(spec, at, unit))
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
      case 'arc':
        return { ...shape, center: point(shape.center), inner: shape.inner * factor, outer: shape.outer * factor }
    }
  })
}
