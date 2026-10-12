import { withBase } from '@/utils/url'
import type { ReadSource } from '../types/read-listen.types'
import { readLinkFailureFrom, readSourceFromExtract, type ReadLinkFailure } from '../utils/read-link'

export class ReadLinkError extends Error {
  constructor(readonly code: ReadLinkFailure) { super(code) }
}

// Không gửi cookie / referrer: máy chủ không cần biết ai đọc, và trang được đọc không thấy trang nào dẫn tới.
const REQUEST: RequestInit = { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }

/** Cờ `read.linkEnabled` của máy chủ. Lỗi mạng / phản hồi lạ = tắt: tab Link chỉ hiện khi chắc chắn bật. */
export async function fetchReadLinkEnabled(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(withBase('/api/v1/read/config'), { ...REQUEST, signal })
    if (!response.ok) return false
    const value = await response.json() as { ok?: unknown; linkEnabled?: unknown }
    return value.ok === true && value.linkEnabled === true
  } catch {
    return false
  }
}

/** Nhờ máy chủ tải bài; ném `ReadLinkError` với mã hiển thị được. */
export async function extractReadLink(url: string, signal?: AbortSignal): Promise<ReadSource> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1/read/extract'), {
      ...REQUEST, signal, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' },
      body: JSON.stringify({ url }),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ReadLinkError('OFFLINE')
  }
  let value: unknown = null
  try { value = await response.json() } catch { /* thân không phải JSON: rơi xuống UNSUPPORTED */ }
  if (!response.ok) throw new ReadLinkError(readLinkFailureFrom(response.status, (value as { code?: unknown } | null)?.code))
  const source = readSourceFromExtract(value)
  if (!source) throw new ReadLinkError('UNSUPPORTED')
  return source
}
