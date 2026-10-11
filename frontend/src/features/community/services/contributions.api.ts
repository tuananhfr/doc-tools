import { withBase } from '@/utils/url'
import { CONTRIBUTION_STATUSES, type ContributionStatus } from '@/features/account/types/account.types'
import type { ContributionPayload, ContributionReceipt, SourceRef } from '../types/community.types'

export class ContributionApiError extends Error {
  constructor(public readonly code: string) { super(code) }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(withBase(`/api/v1/contributions${path}`), { cache: 'no-store', credentials: 'same-origin', ...init })
  const value = await response.json() as T & { ok?: boolean; code?: string }
  if (!response.ok || value.ok !== true) throw new ContributionApiError(value.code || `HTTP_${response.status}`)
  return value
}

export async function submitContribution(payload: ContributionPayload, key: string): Promise<ContributionReceipt> {
  const value = await request<ContributionReceipt>('', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1', 'Idempotency-Key': key }, body: JSON.stringify(payload) })
  if (!/^[A-Za-z0-9_-]{32}$/.test(value.receiptCode) || !CONTRIBUTION_STATUSES.includes(value.status)) throw new ContributionApiError('INVALID_RESPONSE')
  return value
}

export function lookupReceipt(code: string, signal: AbortSignal) {
  return request<{ contribution: { status: ContributionStatus; createdAt: string } | null }>(`/receipt/${code}`, { signal })
}

export function addReceiptSource(code: string, source: SourceRef, signal: AbortSignal) {
  return request<{ status: ContributionStatus }>(`/receipt/${code}/sources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceRefs: [source] }), signal })
}

export interface PublicIdea { id: string; text: string; author: string | null }
export function publishedIdeas(signal: AbortSignal) { return request<{ ideas: PublicIdea[] }>('/ideas', { signal }) }
