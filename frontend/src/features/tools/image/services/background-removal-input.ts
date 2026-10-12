import model from './background-removal-model.json'

export function normalizeBackgroundInput(pixels: Uint8ClampedArray): Float32Array {
  const total = model.inputSize ** 2
  if (pixels.length !== total * 4) throw new Error('INVALID_MODEL_INPUT')
  const means = [0.485, 0.456, 0.406]
  const deviations = [0.229, 0.224, 0.225]
  let maximum = 1
  for (let index = 0; index < total; index++) for (let channel = 0; channel < 3; channel++) maximum = Math.max(maximum, pixels[index * 4 + channel])
  const input = new Float32Array(total * 3)
  for (let index = 0; index < total; index++) for (let channel = 0; channel < 3; channel++) input[channel * total + index] = (pixels[index * 4 + channel] / maximum - means[channel]) / deviations[channel]
  return input
}

export function normalizeBackgroundAlpha(prediction: Float32Array): Uint8Array {
  if (prediction.length !== model.inputSize ** 2) throw new Error('INVALID_MODEL_OUTPUT')
  let minimum = Infinity, maximum = -Infinity
  for (const value of prediction) {
    if (!Number.isFinite(value)) throw new Error('INVALID_MODEL_OUTPUT')
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
  }
  if (maximum - minimum < 1e-8) throw new Error('EMPTY_MODEL_OUTPUT')
  return Uint8Array.from(prediction, value => Math.floor((value - minimum) / (maximum - minimum) * 255))
}
