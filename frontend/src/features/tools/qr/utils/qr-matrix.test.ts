import { describe, expect, it } from 'vitest'
import type { QrMatrix } from '../types/qr.types'
import { createMatrix, matrixPath, matrixSpan, QUIET_ZONE } from './qr-matrix'

const grid = (rows: string[]): QrMatrix => ({ size: rows.length, dark: (column, row) => rows[row][column] === '#' })

describe('createMatrix', () => {
  it('dựng mã phiên bản 1 cho chuỗi ngắn, đủ ba ô định vị', () => {
    const matrix = createMatrix('https://erpcons.vn')
    if (!matrix) throw new Error('phải dựng được mã')
    expect(matrix.size).toBeGreaterThanOrEqual(21)
    expect((matrix.size - 21) % 4).toBe(0)
    // Ô định vị: góc ngoài tối, vòng trong sáng, lõi tối.
    for (const [column, row] of [
      [0, 0],
      [matrix.size - 7, 0],
      [0, matrix.size - 7],
    ]) {
      expect(matrix.dark(column, row)).toBe(true)
      expect(matrix.dark(column + 1, row + 1)).toBe(false)
      expect(matrix.dark(column + 3, row + 3)).toBe(true)
    }
    expect(matrixSpan(matrix)).toBe(matrix.size + 8)
  })

  it('chuỗi dài hơn sức chứa mức M vẫn dựng được ở mức L', () => {
    // Byte mode, phiên bản 40: mức M chứa 2.331 byte, mức L 2.953.
    expect(createMatrix('a'.repeat(2331))?.size).toBe(177)
    expect(createMatrix('a'.repeat(2900))?.size).toBe(177)
  })

  it('trả null khi vượt sức chứa của một mã', () => {
    expect(createMatrix('a'.repeat(3000))).toBeNull()
  })
})

describe('matrixPath', () => {
  it('gộp các ô liền nhau trên một hàng, cộng vùng trắng', () => {
    const path = matrixPath(grid(['##.#', '....', '.###', '#...']))
    expect(path).toBe(
      [`M${QUIET_ZONE} ${QUIET_ZONE}h2v1h-2z`, `M${QUIET_ZONE + 3} ${QUIET_ZONE}h1v1h-1z`, `M${QUIET_ZONE + 1} ${QUIET_ZONE + 2}h3v1h-3z`, `M${QUIET_ZONE} ${QUIET_ZONE + 3}h1v1h-1z`].join(''),
    )
  })

  it('lưới không có ô tối cho ra đường rỗng', () => {
    expect(matrixPath(grid(['..', '..']))).toBe('')
  })
})
