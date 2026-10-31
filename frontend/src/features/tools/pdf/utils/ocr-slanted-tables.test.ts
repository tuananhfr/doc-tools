import { describe, expect, it } from 'vitest'
import { detectRuledTables } from './ocr-ruled-tables'
import { perspectiveMatrix } from './ocr-perspective'
import { transformPoint } from './ocr-transform'

describe('photographed ruled tables', () => {
  it('isolates a nine-column invoice grid from its enclosing form and dark photo border', () => {
    const width = 500, height = 720, data = new Uint8Array(width * height)
    const rows = [230, 258, 274, 290, 306, 322, 338, 354, 370, 386]
    const columns = [40, 62, 180, 220, 250, 295, 350, 380, 425, 465]
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const gx = x - y * .008, gy = y + x * .012
      const frame = gy > 20 && gy < 690 && [40, 465].some(v => Math.abs(gx - v) < .8)
        || gx >= 40 && gx <= 465 && [20, 80, 150, 690].some(v => Math.abs(gy - v) < .8)
      const grid = gx >= 40 && gx <= 465 && rows.some(v => Math.abs(gy - v) < .8)
        || gy >= 230 && gy <= 386 && columns.some(v => Math.abs(gx - v) < .8)
      const border = x < 9 || x > width - 10 || y < 9 || y > height - 10
      data[y * width + x] = border ? 30 : frame || grid ? 140 : Math.round(180 + x / 40 + y / 90)
    }
    const tables = detectRuledTables({ width, height, data }, [], p => p)
    expect(tables).toHaveLength(1)
    expect(tables[0]).toMatchObject({ rows: 9, columns: 9 })
    expect(tables[0].cells).toHaveLength(81)
    expect(Math.min(...tables[0].cells.flatMap(cell => cell.bbox.map(p => p.y)))).toBeGreaterThan(215)
    expect(Math.max(...tables[0].cells.flatMap(cell => cell.bbox.map(p => p.y)))).toBeLessThan(395)
  }, 15000)

  it('recovers a faint perspective grid, split quantity heading and vertically merged labels', () => {
    const width = 400, height = 500, data = new Uint8Array(width * height)
    const toGrid = perspectiveMatrix([{ x: 50, y: 155 }, { x: 350, y: 145 }, { x: 365, y: 420 }, { x: 42, y: 430 }], [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 260 }, { x: 0, y: 260 }])
    const rows = [0, 20, 55, 95, 130, 165, 210, 260], columns = [0, 20, 140, 175, 220, 260, 300]
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = transformPoint(toGrid, { x, y })
      const horizontal = p.x >= 0 && p.x <= 300 && rows.some(row => Math.abs(p.y - row) < .8 && (row !== 20 || p.x >= 175 && p.x <= 260))
      const vertical = p.y >= 0 && p.y <= 260 && columns.some(column => Math.abs(p.x - column) < .8 && (column !== 220 || p.y >= 20))
      data[y * width + x] = horizontal || vertical ? 153 : Math.round(185 + x / 40 + y / 80)
    }
    const tables = detectRuledTables({ width, height, data }, [], p => p)
    expect(tables).toHaveLength(1)
    const table = tables[0]
    expect(table).toMatchObject({ rows: 7, columns: 6, origin: 'ruled' })
    expect(table.cells.find(cell => cell.row === 0 && cell.column === 3)?.columnSpan).toBe(2)
    for (const column of [0, 1, 2, 5]) expect(table.cells.find(cell => cell.row === 0 && cell.column === column)?.rowSpan).toBe(2)
    expect(table.cells.filter(cell => cell.row >= 2)).toHaveLength(30)
  })

  it('does not turn shadow gradients, text strokes or a lone sloping border into a table', () => {
    const width = 320, height = 420, data = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const text = x > 50 && x < 260 && x % 14 < 6 && y > 80 && y < 340 && y % 32 < 9
      data[y * width + x] = text || Math.abs(x - 20 - y * .04) < 1 ? 90 : Math.round(160 + x / 8 + y / 16)
    }
    expect(detectRuledTables({ width, height, data }, [], p => p)).toEqual([])
  })
})
