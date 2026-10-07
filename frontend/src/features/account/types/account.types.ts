export type Capability =
  | 'tool.use' | 'contribution.anonymous'
  | 'contribution.attributed' | 'contribution.track' | 'contribution.evidence'
  | 'ai.agent' | 'cloud.memory' | 'sync.basic' | 'byoai.history'

export interface AccountUser {
  id: number
  email: string
  displayName: string | null
  publicAttribution: boolean
}

/** Body of `GET /me`; guests get the same shape with `user: null`. */
export interface AccountState {
  user: AccountUser | null
  plan: { pro: boolean; endsAt: string | null }
  capabilities: Capability[]
}

export interface ProfileInput {
  displayName: string
  publicAttribution: boolean
}

export const ACCOUNT_ERROR_CODES = ['EMAIL_INVALID', 'OTP_INVALID', 'RATE_LIMITED', 'ACCOUNT_DISABLED', 'UNTRUSTED_REQUEST', 'SIGNED_OUT', 'NETWORK', 'UNKNOWN'] as const
export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number]
