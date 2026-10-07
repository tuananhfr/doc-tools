import type { OcrMatrix } from '../types/ocr-profile.types'
import type { Quad } from '../types/text-layer.types'

export function perspectiveMatrix(from: Quad, to: Quad): OcrMatrix {
  const equations = from.flatMap((point, i) => {
    const target = to[i]
    return [[point.x, point.y, 1, 0, 0, 0, -target.x * point.x, -target.x * point.y, target.x],
      [0, 0, 0, point.x, point.y, 1, -target.y * point.x, -target.y * point.y, target.y]]
  })
  for (let column = 0; column < 8; column++) {
    let pivot = column
    for (let row = column + 1; row < 8; row++) if (Math.abs(equations[row][column]) > Math.abs(equations[pivot][column])) pivot = row
    if (Math.abs(equations[pivot][column]) < 1e-10) throw new Error('OCR_INVALID_CORNERS')
    ;[equations[column], equations[pivot]] = [equations[pivot], equations[column]]
    const divisor = equations[column][column]
    equations[column] = equations[column].map(value => value / divisor)
    for (let row = 0; row < 8; row++) if (row !== column) {
      const factor = equations[row][column]
      equations[row] = equations[row].map((value, i) => value - factor * equations[column][i])
    }
  }
  return [...equations.map(row => row[8]), 1] as unknown as OcrMatrix
}

export function validPaperCorners(quad: Quad, width: number, height: number): boolean {
  if (quad.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > width || point.y < 0 || point.y > height)) return false
  const crosses = quad.map((point, i) => {
    const next = quad[(i + 1) % 4], after = quad[(i + 2) % 4]
    return (next.x - point.x) * (after.y - next.y) - (next.y - point.y) * (after.x - next.x)
  })
  const area = Math.abs(quad.reduce((sum, point, i) => sum + point.x * quad[(i + 1) % 4].y - point.y * quad[(i + 1) % 4].x, 0)) / 2
  return crosses.every(value => value > 0) && area > width * height * 0.15
}
