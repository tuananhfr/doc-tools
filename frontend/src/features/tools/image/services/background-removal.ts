export function detectSolidBackground(image: ImageData, tolerance: number): Uint8Array {
  const { width, height, data } = image
  const total = width * height
  const mask = new Uint8Array(total).fill(1)
  const samples: number[][] = [[], [], []]
  const sample = (index: number) => { if (data[index * 4 + 3] < 16) return; for (let channel = 0; channel < 3; channel++) samples[channel].push(data[index * 4 + channel]) }
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 100))) { sample(x); sample((height - 1) * width + x) }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 100))) { sample(y * width); sample(y * width + width - 1) }
  const target = samples.map((channel) => channel.sort((a, b) => a - b)[Math.floor(channel.length / 2)] ?? 255)
  const maxDistance = tolerance * tolerance * 3
  const similar = (index: number) => {
    if (data[index * 4 + 3] < 16) return true
    const r = data[index * 4] - target[0], g = data[index * 4 + 1] - target[1], b = data[index * 4 + 2] - target[2]
    return r * r + g * g + b * b <= maxDistance
  }
  const queue = new Int32Array(total)
  let head = 0, tail = 0
  const add = (index: number) => { if (mask[index] && similar(index)) { mask[index] = 0; queue[tail++] = index } }
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1) }
  while (head < tail) {
    const index = queue[head++]
    const x = index % width, y = Math.floor(index / width)
    if (x > 0) add(index - 1)
    if (x + 1 < width) add(index + 1)
    if (y > 0) add(index - width)
    if (y + 1 < height) add(index + width)
  }
  return mask
}

export function applyBackgroundMask(source: ImageData, mask: Uint8Array, background: string | null): ImageData {
  const result = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
  const color = background ? [1, 3, 5].map((start) => Number.parseInt(background.slice(start, start + 2), 16)) : null
  for (let index = 0; index < mask.length; index++) {
    if (mask[index]) continue
    const offset = index * 4
    if (color) { result.data[offset] = color[0]; result.data[offset + 1] = color[1]; result.data[offset + 2] = color[2]; result.data[offset + 3] = 255 }
    else result.data[offset + 3] = 0
  }
  return result
}

export function paintBackgroundMask(mask: Uint8Array, width: number, height: number, x: number, y: number, radius: number, keep: boolean): void {
  const minX = Math.max(0, Math.floor(x - radius)), maxX = Math.min(width - 1, Math.ceil(x + radius))
  const minY = Math.max(0, Math.floor(y - radius)), maxY = Math.min(height - 1, Math.ceil(y + radius))
  for (let row = minY; row <= maxY; row++) for (let column = minX; column <= maxX; column++) if ((column - x) ** 2 + (row - y) ** 2 <= radius ** 2) mask[row * width + column] = keep ? 1 : 0
}
