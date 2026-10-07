import { BinaryBitmap, DecodeHintType, HybridBinarizer, RGBLuminanceSource } from '@zxing/library'
import FinderPatternFinder from '@zxing/library/esm/core/qrcode/detector/FinderPatternFinder'
import type { CameraCrop } from '../utils/camera-geometry'

const quietCallback = { foundPossibleResultPoint: () => {} }
const locatorHints = new Map([[DecodeHintType.TRY_HARDER, true]])

/** Locates standard QR finder patterns without requiring a readable payload. */
export function locateQr(image: Pick<ImageData, 'data' | 'width' | 'height'>): CameraCrop | null {
  try {
    const luminance = new Uint8ClampedArray(image.width * image.height)
    for (let i = 0; i < luminance.length; i++) {
      const offset = i * 4
      luminance[i] = (image.data[offset] + 2 * image.data[offset + 1] + image.data[offset + 2]) / 4
    }
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, image.width, image.height)))
    // ZXing exposes the finder separately from payload decoding in this pinned package.
    const patterns = new FinderPatternFinder(bitmap.getBlackMatrix(), quietCallback).find(locatorHints)
    const points = [patterns.getBottomLeft(), patterns.getTopLeft(), patterns.getTopRight()]
    const [bottomLeft, topLeft, topRight] = points
    const ax = bottomLeft.getX() - topLeft.getX()
    const ay = bottomLeft.getY() - topLeft.getY()
    const bx = topRight.getX() - topLeft.getX()
    const by = topRight.getY() - topLeft.getY()
    const a = Math.hypot(ax, ay)
    const b = Math.hypot(bx, by)
    const modules = points.map(point => point.getEstimatedModuleSize())
    const module = modules.reduce((sum, value) => sum + value, 0) / 3
    const dimension = (a + b) / (2 * module) + 7
    if (module < 0.8 || dimension < 19 || dimension > 179 || Math.max(a, b) / Math.min(a, b) > 1.8) return null
    if (Math.abs(ax * bx + ay * by) / (a * b) > 0.35 || Math.max(...modules) / Math.min(...modules) > 1.7) return null
    const xs = [...points.map(point => point.getX()), bottomLeft.getX() + topRight.getX() - topLeft.getX()]
    const ys = [...points.map(point => point.getY()), bottomLeft.getY() + topRight.getY() - topLeft.getY()]
    const padding = module * 3.5
    const x = (Math.min(...xs) - padding) / image.width
    const y = (Math.min(...ys) - padding) / image.height
    const width = (Math.max(...xs) - Math.min(...xs) + 2 * padding) / image.width
    const height = (Math.max(...ys) - Math.min(...ys) + 2 * padding) / image.height
    if (x < 0 || y < 0 || x + width > 1 || y + height > 1) return null
    return { x, y, width, height }
  } catch {
    return null
  }
}
