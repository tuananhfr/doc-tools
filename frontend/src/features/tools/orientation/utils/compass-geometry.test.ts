import { describe, expect, it } from 'vitest'
import { compassShapes, scaleShapes, type CompassShape, type CompassSpec, type StarSegment } from './compass-geometry'

const KHON_STARS: StarSegment[] = [
  { label: 'Tuyệt mệnh', good: false },
  { label: 'Sinh khí', good: true },
  { label: 'Hoạ hại', good: false },
  { label: 'Ngũ quỷ', good: false },
  { label: 'Lục sát', good: false },
  { label: 'Phục vị', good: true },
  { label: 'Thiên y', good: true },
  { label: 'Diên niên', good: true },
]

const spec = (north: number, stars: StarSegment[] | null): CompassSpec => ({
  center: { x: 0, y: 0 },
  radius: 100,
  north,
  divisions: 8,
  degrees: false,
  needles: [],
  rings: { stars },
})

const texts = (shapes: CompassShape[]) => shapes.filter((shape): shape is Extract<CompassShape, { kind: 'text' }> => shape.kind === 'text')

describe('mặt la kinh', () => {
  it('đủ 24 sơn, 8 hướng, 8 quái, vòng độ; chưa có tuổi thì không có vòng sao', () => {
    const shapes = compassShapes(spec(0, null))
    const roles = texts(shapes).map((shape) => shape.role)
    expect(roles.filter((role) => role === 'mountain')).toHaveLength(24)
    expect(roles.filter((role) => role === 'trigram')).toHaveLength(8)
    expect(shapes.some((shape) => shape.kind === 'arc')).toBe(false)
    expect(shapes.filter((shape) => shape.role === 'tick' || shape.role === 'tick-major').length).toBeGreaterThanOrEqual(72)
  })

  it('vòng sao: 8 ô, cát / hung đúng màu, ô nào cũng quét đúng 45° theo chiều kim đồng hồ', () => {
    const arcs = compassShapes(spec(0, KHON_STARS)).filter((shape): shape is Extract<CompassShape, { kind: 'arc' }> => shape.kind === 'arc')
    expect(arcs).toHaveLength(8)
    expect(arcs.map((arc) => arc.role)).toEqual(KHON_STARS.map((star) => (star.good ? 'star-good' : 'star-bad')))
    for (const arc of arcs) expect(arc.end - arc.start).toBe(45)
    // Ô Bắc trùm qua 0°: phải là -22,5 → 22,5, không phải 337,5 → 22,5.
    expect(arcs[0]).toMatchObject({ start: -22.5, end: 22.5 })
  })

  it('mặt số xoay: Bắc ở 181,6° (máy chĩa 178,4°) thì sơn Ngọ nằm gần đỉnh, chữ chạy theo vòng', () => {
    const ngo = texts(compassShapes(spec(-178.4, KHON_STARS))).find((shape) => shape.text === 'Ngọ')!
    expect(ngo.at.y).toBeLessThan(0)
    expect(Math.abs(ngo.at.x)).toBeLessThan(5)
    expect(ngo.rotate).toBeCloseTo(1.6, 6)
    expect(ngo.halo).toBe(false)
  })

  it('tên sơn dài nhất vừa trong ô 15° của nó, không tràn sang sơn kề', () => {
    for (const radius of [100, 144, 300]) {
      const mountains = texts(compassShapes({ ...spec(0, KHON_STARS), radius })).filter((shape) => shape.role === 'mountain')
      for (const label of mountains) {
        const cell = (2 * Math.PI * Math.hypot(label.at.x, label.at.y)) / 24
        // 0,73 = bề rộng trung bình một ký tự / cỡ chữ đo trong trình duyệt với "Nhâm".
        expect(label.text.length * 0.73 * label.size).toBeLessThan(cell)
      }
    }
  })

  it('phóng to giữ nguyên hình quạt', () => {
    const [arc] = scaleShapes(compassShapes(spec(0, KHON_STARS)), 2).filter((shape) => shape.kind === 'arc')
    expect(arc).toMatchObject({ center: { x: 0, y: 0 }, start: -22.5, end: 22.5 })
    if (arc.kind === 'arc') expect(arc.outer).toBeGreaterThan(150)
  })
})

describe('kim không đè lên chữ của mặt số', () => {
  const distanceToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
  }
  const isNeedle = (shape: CompassShape) => shape.role === 'target' || shape.role === 'target-active'

  const cases: [string, Partial<CompassSpec>][] = [
    ['mặt la kinh có vòng sao', { rings: { stars: KHON_STARS } }],
    ['mặt la kinh chưa có tuổi', { rings: { stars: null } }],
    ['la bàn kỹ thuật có số độ', { rings: null, degrees: true, divisions: 16 }],
    ['la bàn kỹ thuật 8 hướng', { rings: null, degrees: false }],
  ]

  for (const [name, patch] of cases) {
    it(name, () => {
      for (let azimuth = 0; azimuth < 360; azimuth += 2.5) {
        const shapes = compassShapes({ ...spec(17, null), radius: 144, ...patch, needles: [{ azimuth, label: 'Nhà', active: true }] })
        const labels = texts(shapes).filter((shape) => !isNeedle(shape))
        for (const shape of shapes.filter(isNeedle)) {
          for (const label of labels) {
            // Ước lượng chữ bằng hình tròn bán kính nửa cỡ chữ quanh tâm — đủ chặt cho phương bán kính mà kim đi.
            if (shape.kind === 'line') expect(distanceToSegment(label.at, shape.from, shape.to)).toBeGreaterThan(label.size / 2 + shape.width / 2)
            if (shape.kind === 'circle') expect(Math.hypot(label.at.x - shape.center.x, label.at.y - shape.center.y)).toBeGreaterThan(label.size / 2 + shape.radius)
          }
        }
      }
    })
  }
})
