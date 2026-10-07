import type { Capability } from '../types/account.types'

/**
 * What the account page lists, in order. `live` flips on when the feature ships (P1+ of
 * docs/pro/pro-spec.md); until then the row says "coming soon" instead of promising it.
 */
export const CAPABILITY_ROWS = [
  { id: 'contribution.attributed', label: 'attributed', icon: 'person-check', pro: false, live: false },
  { id: 'contribution.track', label: 'track', icon: 'list-check', pro: false, live: false },
  { id: 'contribution.evidence', label: 'evidence', icon: 'link-45deg', pro: false, live: false },
  { id: 'ai.agent', label: 'agent', icon: 'stars', pro: true, live: false },
  { id: 'cloud.memory', label: 'cloud', icon: 'cloud-check', pro: true, live: false },
  { id: 'sync.basic', label: 'sync', icon: 'arrow-repeat', pro: true, live: false },
  { id: 'byoai.history', label: 'history', icon: 'clock-history', pro: true, live: false },
] as const satisfies readonly { id: Capability; label: string; icon: string; pro: boolean; live: boolean }[]
