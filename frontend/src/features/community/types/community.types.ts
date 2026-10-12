import type { ContributionStatus } from '@/features/account/types/account.types'

export type FeedbackCategory = 'bug' | 'improvement' | 'tool' | 'data'
export type SourceType = 'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER'
export interface SourceRef { url: string; type: SourceType }
export interface ToolContext { toolSlug: string; toolName: string }
export interface ContributionPayload {
  toolId: string
  domain: string
  baseSnapshotId: null
  jurisdiction: string | null
  proposedChanges: { field: string; before: string; after: string }[]
  sourceRefs: SourceRef[]
  attribution: boolean
}
export interface ContributionReceipt { receiptCode: string; status: ContributionStatus; tracked: boolean }
