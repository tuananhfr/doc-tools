import { expect, it } from 'vitest'
import { cellInkRows, clearCellRules, rectifyCellPixels } from './ocr-cell-image'

it('straightens a slanted cell without shaving off a character near its right edge', () => {
  const width = 100, height = 80, data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 25; y <= 40; y++) for (let x = 73; x <= 77; x++) {
    const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0
  }
  const result = rectifyCellPixels(data, width, height, [{ x: 10, y: 20 }, { x: 80, y: 10 }, { x: 90, y: 60 }, { x: 20, y: 70 }])
  expect(result.width).toBe(71)
  expect(result.height).toBe(51)
  expect(Array.from(result.data).filter((value, i) => i % 4 === 0 && value < 100).length).toBeGreaterThan(30)
  expect(result.data.length).toBe(result.width * result.height * 4)
})

it('clears long cell borders while retaining short nearby text strokes and source pixels', () => {
  const width = 80, height = 60, data = new Uint8ClampedArray(width * height * 4).fill(255)
  const paint = (x: number, y: number) => { const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 0 }
  for (let x = 0; x < width; x++) paint(x, 1)
  for (let y = 0; y < height; y++) paint(78, y)
  for (let y = 22; y < 36; y++) paint(4, y)
  const result = clearCellRules(data, width, height)
  expect(result[(width + 20) * 4]).toBe(255)
  expect(result[(30 * width + 78) * 4]).toBe(255)
  expect(result[(30 * width + 4) * 4]).toBe(0)
  expect(data[(width + 20) * 4]).toBe(0)
})

it('separates two printed rows without separating their detached accent marks', () => {
  const w = 80, h = 70, data = new Uint8ClampedArray(w * h * 4).fill(255)
  const paint = (y: number, left: number, right: number) => {
    for (let x = left; x < right; x++) data[(y * w + x) * 4] = 0
  }
  for (let y = 10; y <= 12; y++) paint(y, 20, 23)
  for (let y = 16; y <= 25; y++) paint(y, 15, 40)
  for (let y = 40; y <= 53; y++) paint(y, 15, 45)
  paint(62, 0, w)
  expect(cellInkRows(data, w, h)).toEqual([{ top: 7, bottom: 29 }, { top: 37, bottom: 57 }])
  expect(cellInkRows(new Uint8ClampedArray(data.length).fill(255), w, h)).toEqual([])
})
