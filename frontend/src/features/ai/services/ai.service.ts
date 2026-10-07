import { withBase } from '@/utils/url'
import { AI_ERROR_CODES, type AiErrorCode, type AiSetup, type AiTicket, type AiUpload, type ContributionDraft, type DraftSubmitResult, type ProviderTypeOption } from '../types/ai.types'

export class AiError extends Error {
  constructor(readonly code: AiErrorCode, readonly status: number, readonly detail: string | null = null) {
    super(code)
  }
}

const isKnownCode = (value: unknown): value is AiErrorCode => (AI_ERROR_CODES as readonly unknown[]).includes(value)

interface CallInit { method: 'POST' | 'PUT' | 'DELETE'; body?: unknown; file?: File }

function requestInit(init?: CallInit): RequestInit {
  if (!init) return { cache: 'no-store', credentials: 'same-origin' }
  // The backend refuses cookie-authenticated writes without this header (CSRF barrier).
  if (init.file) {
    return { method: init.method, credentials: 'same-origin', body: init.file,
      headers: { 'Content-Type': 'application/octet-stream', 'X-CN-Request': '1', 'X-CN-Filename': encodeURIComponent(init.file.name) } }
  }
  return { method: init.method, headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify(init.body ?? {}), credentials: 'same-origin' }
}

async function call<T>(path: string, init?: CallInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1' + path), requestInit(init))
  } catch {
    throw new AiError('NETWORK', 0)
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: unknown; message?: unknown } & T) | null
  if (response.ok && value?.ok) return value
  // A body over the route limit is stopped by the HTTP layer, before our own error codes.
  const fallback = response.status === 401 ? 'SIGNED_OUT' : response.status === 413 ? 'UPLOAD_TOO_LARGE' : 'UNKNOWN'
  const code = isKnownCode(value?.code) ? value.code : fallback
  // The verify failure carries the provider's own words (wrong model, quota…), which the user needs.
  throw new AiError(code, response.status, typeof value?.message === 'string' ? value.message : null)
}

export type SavedProvider = AiSetup & { models: string[] }

export const aiService = {
  providerTypes: () => call<{ items: ProviderTypeOption[] }>('/ai/provider-types').then((result) => result.items),
  setup: () => call<AiSetup>('/ai/setup'),
  saveProvider: (input: { type: string; apiKey: string; apiBase?: string }) => call<SavedProvider>('/ai/provider', { method: 'PUT', body: input }),
  verify: (model: string) => call<AiSetup>('/ai/provider/verify', { method: 'POST', body: { model } }),
  removeProvider: () => call<AiSetup>('/ai/provider', { method: 'DELETE' }),
  session: () => call<AiTicket>('/ai/session', { method: 'POST' }),
  recordSourceCheck: (input: { toolId: string; baseSnapshotId: string | null; sessionKey: string }) => call<{ id: string }>('/ai/source-checks', { method: 'POST', body: input }),
  drafts: (toolId: string) => call<{ items: ContributionDraft[] }>(`/me/contribution-drafts?toolId=${encodeURIComponent(toolId)}`).then((result) => result.items),
  submitDraft: (id: string, input: { selectedIndexes: number[]; attribution: boolean }) => call<DraftSubmitResult>(`/me/contribution-drafts/${id}/submit`, { method: 'POST', body: input }),
  removeDraft: (id: string) => call<object>(`/me/contribution-drafts/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => call<{ upload: AiUpload }>('/ai/uploads', { method: 'POST', file }).then((result) => result.upload),
  /** One fetch, a few minutes: made right before chat.send, never stored. */
  linkUpload: (id: string) => call<{ url: string; expiresAt: number }>(`/ai/uploads/${id}/link`, { method: 'POST' }),
  removeUpload: (id: string) => call<object>(`/ai/uploads/${id}`, { method: 'DELETE' }),
}
