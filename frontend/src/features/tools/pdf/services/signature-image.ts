import { TOOL_ERROR, ToolError } from '@/features/tools/hub'
import { canvasToBlob } from '@/features/tools/shared'
import { rgbCss } from '../utils/decorations'
import { INK_COLOR, SIGNATURE_STROKE, strokeBounds, strokePath, type SignatureInk, type Stroke } from '../utils/signature'
import type { StampImage } from './stamp-image'

/** Điểm ảnh cho mỗi đơn vị của ô ký: chữ ký rộng nửa trang A4 vẫn nét ở ~300 DPI. */
const SCALE = 4

/**
 * Nét vẽ tay → PNG nền TRONG SUỐT, cắt sát nét. Cắt sát để "bề rộng chữ ký" trên
 * trang là bề rộng của chính nét ký, không phải của cả ô ký còn trống ba phần tư.
 */
export async function renderSignature(strokes: Stroke[], ink: SignatureInk): Promise<StampImage> {
  const bounds = strokeBounds(strokes)
  if (!bounds) throw new Error('chưa có nét ký nào.')

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(bounds.width * SCALE))
  canvas.height = Math.max(1, Math.ceil(bounds.height * SCALE))
  const context = canvas.getContext('2d')
  if (!context) throw new ToolError(TOOL_ERROR.memory, 'Trình duyệt không cấp được vùng vẽ cho chữ ký.')

  context.setTransform(SCALE, 0, 0, SCALE, -bounds.x * SCALE, -bounds.y * SCALE)
  context.strokeStyle = rgbCss(INK_COLOR[ink])
  context.lineWidth = SIGNATURE_STROKE
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const stroke of strokes) context.stroke(new Path2D(strokePath(stroke)))

  const blob = await canvasToBlob(canvas, 'image/png')
  const aspect = canvas.height / canvas.width
  canvas.width = 0
  return { name: 'chữ ký vẽ tay', bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png', aspect }
}
