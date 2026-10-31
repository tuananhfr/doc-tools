import { recognizeCanvas } from './ocr'
import { scoreOcrOrientation, selectOcrOrientation, strongOcrOrientation, type OcrOrientationReading, type OcrQuarterTurn } from '../utils/ocr-orientation'

/** Compare a bounded thumbnail in all four reading directions. Reuses the same
 * local Vietnamese worker, with no extra model or image upload. Already legible
 * upright documents take a single probe; ambiguous images keep their direction.
 */
export async function detectOcrOrientation(source: HTMLCanvasElement, signal: AbortSignal): Promise<OcrQuarterTurn> {
  signal.throwIfAborted()
  const probe = document.createElement('canvas'), readings: OcrOrientationReading[] = []
  const scale = Math.min(1, 1200 / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale)), height = Math.max(1, Math.round(source.height * scale))
  try {
    for (const rotation of [0, 90, 270, 180] as const) {
      signal.throwIfAborted()
      const sideways = rotation % 180 !== 0
      probe.width = sideways ? height : width; probe.height = sideways ? width : height
      const context = probe.getContext('2d')!
      context.fillStyle = 'white'; context.fillRect(0, 0, probe.width, probe.height)
      context.translate(probe.width / 2, probe.height / 2); context.rotate(rotation * Math.PI / 180)
      context.drawImage(source, -width / 2, -height / 2, width, height)
      const lines = await recognizeCanvas(probe, () => undefined, false, signal, '11')
      signal.throwIfAborted()
      const reading = scoreOcrOrientation(rotation, lines); readings.push(reading)
      if (rotation === 0 && strongOcrOrientation(reading)) return 0
    }
    return selectOcrOrientation(readings)
  } finally { probe.width = probe.height = 1 }
}
