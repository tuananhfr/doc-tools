import { STROKE_ERASE, STROKE_KEEP } from './mask-strokes'

export function composeBackgroundAlpha(auto: Uint8Array, strokes: Uint8Array, output: Uint8Array): void {
  for (let index = 0; index < auto.length; index++) output[index] = strokes[index] === STROKE_KEEP ? 255 : strokes[index] === STROKE_ERASE ? 0 : auto[index]
}

export function renderBackgroundAlpha(source: ImageData, mask: Uint8Array, background: string | null): ImageData {
  const output = new Uint8ClampedArray(source.data.length)
  const color = background ? [1, 3, 5].map(offset => Number.parseInt(background.slice(offset, offset + 2), 16)) : null
  for (let index = 0; index < mask.length; index++) {
    const offset = index * 4
    const alpha = source.data[offset + 3] / 255 * mask[index] / 255
    for (let channel = 0; channel < 3; channel++) output[offset + channel] = color ? source.data[offset + channel] * alpha + color[channel] * (1 - alpha) : source.data[offset + channel]
    output[offset + 3] = color ? 255 : alpha * 255
  }
  return new ImageData(output, source.width, source.height)
}
