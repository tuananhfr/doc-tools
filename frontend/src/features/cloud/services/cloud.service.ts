import { withBase } from '@/utils/url'
import { CLOUD_ERROR_CODES, type CloudErrorCode, type SavedItem, type SavedList, type SavedMeta, type SourceCheckPage } from '../types/cloud.types'

export class CloudError extends Error {
  /** `current` is the server copy that a SAVED_CONFLICT answer carries. */
  constructor(readonly code: CloudErrorCode, readonly status: number, readonly current: SavedMeta | null = null) {
    super(code)
  }
}

const isKnownCode = (value: unknown): value is CloudErrorCode => (CLOUD_ERROR_CODES as readonly unknown[]).includes(value)

interface CallInit { method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }

async function call<T>(path: string, init?: CallInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1' + path), init
      // The backend refuses cookie-authenticated writes without this header (CSRF barrier).
      ? { method: init.method, headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify(init.body ?? {}), credentials: 'same-origin' }
      : { cache: 'no-store', credentials: 'same-origin' })
  } catch {
    throw new CloudError('NETWORK', 0)
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: unknown; item?: SavedMeta } & T) | null
  if (response.ok && value?.ok) return value
  // A body far over the cap is stopped by the HTTP layer, before the service can name it.
  const fallback = response.status === 401 ? 'SIGNED_OUT' : response.status === 413 ? 'CLOUD_ITEM_TOO_LARGE' : 'UNKNOWN'
  const code = isKnownCode(value?.code) ? value.code : fallback
  throw new CloudError(code, response.status, code === 'SAVED_CONFLICT' ? value?.item ?? null : null)
}

const item = (id: string) => `/me/saved/${encodeURIComponent(id)}`

export const cloudService = {
  list: () => call<SavedList & { ok: true }>('/me/saved'),
  get: (id: string) => call<{ item: SavedItem }>(item(id)).then((value) => value.item),
  saveResult: (input: { toolId: string; title: string; payload: Record<string, unknown> }) =>
    call<{ item: SavedMeta }>('/me/saved', { method: 'POST', body: input }).then((value) => value.item),
  update: (id: string, input: { title?: string; payload?: Record<string, unknown>; baseRev: number; force?: boolean }) =>
    call<{ item: SavedMeta }>(item(id), { method: 'PATCH', body: input }).then((value) => value.item),
  remove: (id: string) => call<{ ok: true }>(item(id), { method: 'DELETE' }),
  bookmark: (toolId: string) => call<{ item: SavedMeta }>(`/me/saved/bookmarks/${encodeURIComponent(toolId)}`, { method: 'PUT' }).then((value) => value.item),
  unbookmark: (toolId: string) => call<{ ok: true }>(`/me/saved/bookmarks/${encodeURIComponent(toolId)}`, { method: 'DELETE' }),
  history: (before: string | null) => call<SourceCheckPage>(`/ai/history${before ? `?before=${encodeURIComponent(before)}` : ''}`),
}
