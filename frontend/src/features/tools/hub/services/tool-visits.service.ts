import { client } from '@/api'
import { recordQualityEvent } from './quality-events'
import { qualityToolForPath } from './quality-tool'

export interface ToolStats {
  total: number
}

/**
 * Bộ đếm lượt mở công cụ — `/api/v1/tools/*` (module `erp_tools`, route công khai).
 *
 * Gọi thẳng `client` với hai cờ, cùng lý do với `health-exam.service.ts`:
 * - `skipSessionExpired`: khách không có phiên, một 401 lạc ở đây không được đá
 *   người đang làm tệp sang trang đăng nhập.
 * - `skipOutbox`: lượt đếm lúc mất mạng thì bỏ, không xếp vào hộp thư đi offline.
 *
 * Chỉ gửi slug công cụ — không có tệp, nội dung hay định danh người dùng.
 */
export async function recordVisit(tool: string): Promise<void> {
  recordQualityEvent('tool-opened', qualityToolForPath(`/${tool}`))
  await client.post('tools/visits', { tool }, { skipSessionExpired: true, skipOutbox: true })
}

export async function fetchToolStats(): Promise<ToolStats> {
  const { data } = await client.get<{ ok: boolean; total: number }>('tools/stats', { skipSessionExpired: true })
  return { total: Number(data.total) || 0 }
}
