import type { ContributionStatus } from '../types/account.types'

export type StatusTone = 'warn' | 'info' | 'good' | 'bad' | 'muted'

/** Icon + tone per status; the label comes from `community:contribution.status.*`, never color alone. */
export const CONTRIBUTION_STATUS_LOOK: Record<ContributionStatus, { icon: string; tone: StatusTone }> = {
  NEEDS_SOURCE: { icon: 'exclamation-triangle', tone: 'warn' },
  NEEDS_REVIEW: { icon: 'hourglass-split', tone: 'info' },
  VERIFIED: { icon: 'patch-check', tone: 'info' },
  APPROVED: { icon: 'check2-circle', tone: 'info' },
  PUBLISHED: { icon: 'check-circle-fill', tone: 'good' },
  REJECTED: { icon: 'x-circle', tone: 'bad' },
  SUPERSEDED: { icon: 'arrow-repeat', tone: 'muted' },
  REVOKED: { icon: 'slash-circle', tone: 'muted' },
}
