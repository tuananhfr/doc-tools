import { expect, it } from 'vitest'
import { detectSolidBackground, paintBackgroundMask } from './background-removal'

it('removes only background connected to the border and allows manual restoration', () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4)
  for (let index = 0; index < 25; index++) { pixels[index * 4] = 255; pixels[index * 4 + 1] = 255; pixels[index * 4 + 2] = 255; pixels[index * 4 + 3] = 255 }
  for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) { const index = (y * 5 + x) * 4; pixels[index] = 0; pixels[index + 1] = 0; pixels[index + 2] = 0 }
  const image = { width: 5, height: 5, data: pixels } as ImageData
  const mask = detectSolidBackground(image, 40)
  expect(mask[0]).toBe(0)
  expect(mask[12]).toBe(1)
  paintBackgroundMask(mask, 5, 5, 0, 0, 1, true)
  expect(mask[0]).toBe(1)
})
