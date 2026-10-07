export type Capability =
  | 'tool.use' | 'contribution.anonymous'
  | 'contribution.attributed' | 'contribution.track' | 'contribution.evidence'
  | 'ai.agent' | 'cloud.memory' | 'sync.basic' | 'byoai.history'

export interface AccountUser {
  id: string
  email: string
  displayName: string | null
  publicAttribution: boolean
}

/** Body of `GET /me`; guests get the same shape with `user: null`. */
export interface AccountState {
  user: AccountUser | null
  plan: { pro: boolean; endsAt: string | null }
  capabilities: Capability[]
  /** Set only for accounts with an admin role; ordinary members get `null`. */
  staff: { role: 'owner' | 'admin' | 'reviewer'; permissions: string[] } | null
}

export interface ProfileInput {
  displayName: string
  publicAttribution: boolean
}

export const CONTRIBUTION_STATUSES = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED'] as const
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number]

export const SOURCE_TYPES = ['OFFICIAL_WEB', 'OFFICIAL_DOCUMENT', 'OFFICIAL_API', 'OTHER'] as const
export interface SourceRef { url: string; type: (typeof SOURCE_TYPES)[number] }

/** One row of `GET /me/contributions`; `changes` is a clipped preview, `changeCount` the real total. */
export interface MyContribution {
  id: string
  toolId: string
  domain: string
  status: ContributionStatus
  changes: { field: string; before: string; after: string }[]
  changeCount: number
  sourceRefs: SourceRef[]
  attribution: boolean
  canAddEvidence: boolean
  createdAt: string
}

export interface MyContributionsPage {
  page: number
  pageSize: number
  total: number
  items: MyContribution[]
}

export const ACCOUNT_ERROR_CODES = [
  'EMAIL_INVALID', 'OTP_INVALID', 'RATE_LIMITED', 'ACCOUNT_DISABLED', 'SIGNUP_CLOSED', 'UNTRUSTED_REQUEST', 'SIGNED_OUT',
  'EVIDENCE_CLOSED', 'TOO_MANY_SOURCES', 'SOURCE_INVALID', 'NOT_FOUND', 'STAFF_ACCOUNT', 'CONFIRM_MISMATCH', 'DELETE_FAILED', 'NETWORK', 'UNKNOWN',
] as const
export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number]
