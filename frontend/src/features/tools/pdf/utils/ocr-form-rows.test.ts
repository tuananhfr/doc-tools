import { expect, it } from 'vitest'
import { formTextRows } from './ocr-form-rows'

it('separates staggered tax columns without treating the sloping frame as text', () => {
  const width = 320, height = 190, raw = new Uint8ClampedArray(width * height * 4).fill(255)
  const ink = (x: number, y: number) => { const i = (y * width + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 50 }
  for (let y = 8; y < height - 8; y++) for (const x of [10, 308]) ink(x, y)
  for (let x = 10; x <= 308; x++) for (const y of [Math.round(20 - x * .02), Math.round(175 - x * .02)]) ink(x, y)
  const locations = [{ x: 28, y: 50 }, { x: 196, y: 59 }, { x: 28, y: 70 }, { x: 196, y: 79 }]
  for (const point of locations) for (let y = point.y; y < point.y + 12; y++) for (let x = point.x; x < point.x + 65; x++) if ((x - point.x) % 10 < 5) ink(x, y)
  const rows = formTextRows(raw, width, height)
  expect(rows).toHaveLength(4)
  for (const point of locations) expect(rows.some(row => row.top <= point.y && row.bottom >= point.y + 11 && row.left <= point.x && row.right >= point.x + 65)).toBe(true)
})

it('does not invent text rows on a blank or merely framed page', () => {
  const width = 200, height = 150, raw = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 10; y < 140; y++) for (const x of [10, 190]) { const i = (y * width + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 60 }
  for (let x = 10; x <= 190; x++) for (const y of [10, 140]) { const i = (y * width + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 60 }
  expect(formTextRows(raw, width, height)).toEqual([])
})
