import type { ContributionStatus } from '../types/account.types'

export type StatusTone = 'warn' | 'info' | 'good' | 'bad' | 'muted'

/** Icon + tone per status; the label comes from `community:contribution.status.*`, never color alone. */
export const CONTRIBUTION_STATUS_LOOK: Record<ContributionStatus, { icon: string; tone: StatusTone }> = {
  RECEIVED: { icon: 'inbox', tone: 'info' },
  TRIAGED: { icon: 'funnel', tone: 'info' },
  IN_PROGRESS: { icon: 'tools', tone: 'info' },
  RESOLVED: { icon: 'check-circle', tone: 'good' },
  RELEASED: { icon: 'rocket-takeoff', tone: 'good' },
  DEDUPED: { icon: 'link-45deg', tone: 'muted' },
  NEEDS_SOURCE: { icon: 'exclamation-triangle', tone: 'warn' },
  NEEDS_REVIEW: { icon: 'hourglass-split', tone: 'info' },
  VERIFIED: { icon: 'patch-check', tone: 'info' },
  APPROVED: { icon: 'check2-circle', tone: 'info' },
  PUBLISHED: { icon: 'check-circle-fill', tone: 'good' },
  REJECTED: { icon: 'x-circle', tone: 'bad' },
  SUPERSEDED: { icon: 'arrow-repeat', tone: 'muted' },
  REVOKED: { icon: 'slash-circle', tone: 'muted' },
}
