/** Capability names follow the BYOAI DOCX §16; code checks capabilities, never tier names. */
const GUEST = ['tool.use', 'contribution.anonymous'] as const
const ACCOUNT = ['contribution.attributed', 'contribution.track', 'contribution.evidence'] as const
const PRO = ['ai.agent', 'cloud.memory', 'sync.basic', 'byoai.history'] as const

export type Capability = (typeof GUEST)[number] | (typeof ACCOUNT)[number] | (typeof PRO)[number]

export function capabilitiesFor(signedIn: boolean, pro: boolean): Capability[] {
  return [...GUEST, ...(signedIn ? ACCOUNT : []), ...(signedIn && pro ? PRO : [])]
}
