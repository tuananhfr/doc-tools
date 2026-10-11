import type { ContributionPayload, FeedbackCategory, SourceRef } from '../types/community.types'

const DATA_DOMAINS: Record<string, string> = { 'doi-dia-chi': 'addresses', luong: 'payroll', 'tien-dien': 'electricity' }

export function contributionPayload(input: { mode: 'idea' | 'feedback'; category: FeedbackCategory; toolSlug?: string; title: string; detail: string; source: SourceRef | null; attribution: boolean }): ContributionPayload {
  const idea = input.mode === 'idea'
  const data = !idea && input.category === 'data'
  return {
    toolId: idea ? 'de-xuat-tien-ich' : input.toolSlug || 'gop-y-quy-dinh',
    domain: idea ? 'ideas' : data ? DATA_DOMAINS[input.toolSlug ?? ''] ?? 'legal' : `feedback-${input.category}`,
    baseSnapshotId: null,
    jurisdiction: data ? 'VN' : null,
    proposedChanges: [{ field: idea ? 'idea' : data ? 'rule' : input.category, before: '', after: `${input.title.trim()}\n${input.detail.trim()}` }],
    sourceRefs: data && input.source ? [input.source] : [],
    attribution: idea && input.attribution,
  }
}
