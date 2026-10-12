/**
 * Đổi tốc độ âm thanh mà giữ cao độ (WSOLA). Dùng cho phần Piper đã sinh sẵn khi người dùng kéo tốc độ:
 * sinh lại thì phải đọc lại từ đầu câu, còn đổi `playbackRate` thì giọng bị the thé hoặc ồm.
 */

const FRAME_SECONDS = 0.04
const TOLERANCE_SECONDS = 0.01

/** `speed` > 1 nói nhanh hơn (ngắn đi). Đoạn quá ngắn (< 80 ms) giữ nguyên thay vì cắt mất tiếng. */
export function timeStretch(input: Float32Array, speed: number, sampleRate: number): Float32Array<ArrayBuffer> {
  const frame = 2 * Math.round(FRAME_SECONDS * sampleRate / 2)
  const hop = frame / 2
  const outputLength = Math.floor(input.length / speed)
  if (Math.abs(speed - 1) < 1e-3 || input.length < frame * 2) return new Float32Array(input)

  const tolerance = Math.round(TOLERANCE_SECONDS * sampleRate)
  const window = Float32Array.from({ length: frame }, (_, index) => 0.5 - 0.5 * Math.cos(2 * Math.PI * index / frame))
  const output = new Float32Array(outputLength + frame)
  const weight = new Float32Array(outputLength + frame)
  const lastStart = input.length - frame
  let previous = 0
  for (let at = 0; at < outputLength; at += hop) {
    const ideal = Math.min(lastStart, Math.round(at * speed))
    let best = ideal
    if (at > 0) {
      // Chọn khung khớp pha nhất với phần nối tiếp tự nhiên của khung trước, tránh tiếng rè ở chỗ chồng khung.
      const natural = Math.min(lastStart, previous + hop)
      let bestScore = -Infinity
      // Bước 2 mẫu cho cả dò lẫn tích: tiếng nói ở 22 kHz đủ mịn, mà nhanh gấp 4 trên luồng chính.
      for (let candidate = Math.max(0, ideal - tolerance); candidate <= Math.min(lastStart, ideal + tolerance); candidate += 2) {
        let score = 0
        for (let index = 0; index < hop; index += 2) score += input[natural + index] * input[candidate + index]
        if (score > bestScore) { bestScore = score; best = candidate }
      }
    }
    for (let index = 0; index < frame; index++) {
      output[at + index] += input[best + index] * window[index]
      weight[at + index] += window[index]
    }
    previous = best
  }
  const result = new Float32Array(outputLength)
  for (let index = 0; index < outputLength; index++) result[index] = weight[index] > 1e-3 ? output[index] / weight[index] : output[index]
  return result
}
