import type { GraphicJob, GraphicTemplate } from '../types/graphic.types'
import { graphicSheets } from './graphic-layout'

/** `graphicDimensions` chặn dưới 30 DPI — thumbnail dùng đúng mức thấp nhất renderer cho phép. */
export const THUMBNAIL_DPI = 30
/** Cạnh dài của ảnh proxy: đủ nét cho ô thumbnail ~120px, giải mã ảnh 12 MP một lần thay vì một lần mỗi mẫu. */
export const THUMBNAIL_SOURCE_EDGE = 320

export function fitWithin(size: { width: number; height: number }, edge: number): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(size.width, size.height))
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

/** Việc vẽ thumbnail của một mẫu: tờ đầu tiên, khổ gốc của mẫu (không mang kích thước tự nhập của mẫu đang chọn). */
export function thumbnailJob(job: Omit<GraphicJob, 'template'>, template: GraphicTemplate): GraphicJob {
  const full: GraphicJob = { ...job, template }
  return { ...full, files: graphicSheets(full)[0] }
}
