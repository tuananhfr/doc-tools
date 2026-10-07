import { withBase } from '@/utils/url'
import { AI_ERROR_CODES, type AiErrorCode, type AiSetup, type AiTicket, type ContributionDraft, type DraftSubmitResult, type ProviderTypeOption } from '../types/ai.types'

export class AiError extends Error {
  constructor(readonly code: AiErrorCode, readonly status: number, readonly detail: string | null = null) {
    super(code)
  }
}

const isKnownCode = (value: unknown): value is AiErrorCode => (AI_ERROR_CODES as readonly unknown[]).includes(value)

async function call<T>(path: string, init?: { method: 'POST' | 'PUT' | 'DELETE'; body?: unknown }): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1' + path), init
      // The backend refuses cookie-authenticated writes without this header (CSRF barrier).
      ? { method: init.method, headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify(init.body ?? {}), credentials: 'same-origin' }
      : { cache: 'no-store', credentials: 'same-origin' })
  } catch {
    throw new AiError('NETWORK', 0)
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: unknown; message?: unknown } & T) | null
  if (response.ok && value?.ok) return value
  const code = isKnownCode(value?.code) ? value.code : response.status === 401 ? 'SIGNED_OUT' : 'UNKNOWN'
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
}
