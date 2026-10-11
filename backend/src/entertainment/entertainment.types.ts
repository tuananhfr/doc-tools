export type DeckKind = 'cards' | 'tarot'
export interface CardIdentity { id: string; suit?: string; rank?: string; name?: string }
export interface DrawInput { spread: number; reversed: boolean }
export interface DrawResult {
  kind: DeckKind
  cards: (CardIdentity & { position: number; orientation: 'UPRIGHT' | 'REVERSED' })[]
  expires_at: number
}
export interface Metric { id: string; total: number; value: number | null; steps: number[] }
export interface NumerologyResult { normalized_name: string | null; name_policy: string; master_policy: string; metrics: Metric[]; personal_year: number }
export interface EntertainmentEnvelope<T> {
  ok: true
  request_id: string
  rule_version: string
  source_ids: string[]
  disclaimer_id: 'cn-ent-reference-v1'
  result: T
}
