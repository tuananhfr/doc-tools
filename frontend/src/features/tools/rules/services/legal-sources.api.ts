import { withBase } from '@/utils/url'
import { DEFAULT_STALE_DAYS, parseLegalSource, type LegalSource } from '../utils/source-freshness'
import { SOURCE_ID_PATTERN } from './signed-rules'

/** "missing" = máy chủ nói không có (gói trỏ sai); "unavailable" = không hỏi được — trang báo hai việc khác nhau. */
export type LegalSourceLookup =
  | { state: 'ready'; source: LegalSource; staleDays: number }
  | { state: 'missing' }
  | { state: 'unavailable' }

export async function fetchLegalSource(sourceId: string, fetcher: typeof fetch = fetch): Promise<LegalSourceLookup> {
  if (!SOURCE_ID_PATTERN.test(sourceId)) return { state: 'missing' }
  let body: { ok?: unknown; source?: unknown; staleDays?: unknown }
  try {
    const response = await fetcher(withBase(`/api/v1/sources/${sourceId}`), { cache: 'no-store' })
    if (response.status === 404) return { state: 'missing' }
    if (!response.ok) return { state: 'unavailable' }
    body = await response.json()
  } catch { return { state: 'unavailable' } }
  const source = body && body.ok === true ? parseLegalSource(body.source) : null
  if (!source) return { state: 'unavailable' }
  const staleDays = typeof body.staleDays === 'number' && Number.isInteger(body.staleDays) && body.staleDays > 0 ? body.staleDays : DEFAULT_STALE_DAYS
  return { state: 'ready', source, staleDays }
}
