import { createHash } from 'node:crypto'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

export type FeedbackStatus = 'RECEIVED' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'RELEASED' | 'DEDUPED' | 'REJECTED'
export type ContributionAction = 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke' | 'start' | 'resolve' | 'triage' | 'release' | 'dedupe'

export function isFeedback(domain: unknown): boolean {
  return domain === 'feedback-bug' || domain === 'feedback-improvement'
}

/** Spacing and case differ between two people typing the same report; Vietnamese marks change the word, so they stay. */
export function normalizeFeedbackText(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim()
}

/** The meaning-level duplicate key of general feedback; the old exact-payload UNIQUE hash still guards ideas and rule data. */
export function feedbackKey(toolId: string, domain: string, changes: { after: string }[]): string {
  const text = normalizeFeedbackText(changes.map((change) => change.after).join('\n'))
  return createHash('sha256').update(`${toolId}\n${domain}\n${text}`).digest('hex')
}

/** The previous build reads only the ENUM table; it gets the nearest status it can hold so a rollback keeps working. */
export function legacyFeedbackStatus(status: FeedbackStatus): 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' {
  if (status === 'TRIAGED') return 'RECEIVED'
  if (status === 'RELEASED' || status === 'DEDUPED') return 'RESOLVED'
  return status
}

/** Still waiting on a person: an identical new report is refused instead of filed again. */
export const FEEDBACK_OPEN: FeedbackStatus[] = ['RECEIVED', 'TRIAGED', 'IN_PROGRESS']

type FeedbackAction = 'triage' | 'start' | 'resolve' | 'release' | 'reject' | 'dedupe'
// `start` from RECEIVED stays allowed: triage is a help for busy queues, not a mandatory gate.
const STEPS: Record<FeedbackAction, { from: FeedbackStatus[]; to: FeedbackStatus }> = {
  triage: { from: ['RECEIVED'], to: 'TRIAGED' },
  start: { from: ['RECEIVED', 'TRIAGED'], to: 'IN_PROGRESS' },
  resolve: { from: ['IN_PROGRESS'], to: 'RESOLVED' },
  release: { from: ['RESOLVED'], to: 'RELEASED' },
  reject: { from: ['RECEIVED', 'TRIAGED', 'IN_PROGRESS'], to: 'REJECTED' },
  dedupe: { from: ['RECEIVED', 'TRIAGED'], to: 'DEDUPED' },
}
const isFeedbackAction = (action: ContributionAction): action is FeedbackAction => Object.hasOwn(STEPS, action)
const MAX_CHAIN = 20

/**
 * The report a chain of merges ends at, or null when `id` is not feedback. Locking reads: inside a
 * transaction a plain SELECT sees the snapshot from before a concurrent report committed.
 */
export async function originalFeedback(connection: PoolConnection, id: string, self: string | null = null): Promise<{ id: string; status: FeedbackStatus } | null> {
  let current = id
  for (let hop = 0; hop < MAX_CHAIN; hop++) {
    if (current === self) throw new Error('Duplicate target loops back to this feedback')
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT status, duplicate_of FROM contribution_feedback_state WHERE contribution_id = ? LOCK IN SHARE MODE', [current])
    if (!rows.length) return null
    if (rows[0].status !== 'DEDUPED' || !rows[0].duplicate_of) return { id: current, status: rows[0].status as FeedbackStatus }
    current = rows[0].duplicate_of as string
  }
  throw new Error('Duplicate target chain is too long')
}

export async function transitionFeedback(connection: PoolConnection, id: string, action: ContributionAction, actor: string, note: string | null, duplicateOf: string | null = null): Promise<FeedbackStatus> {
  const [rows] = await connection.execute<RowDataPacket[]>('SELECT status FROM contribution_feedback_state WHERE contribution_id = ? FOR UPDATE', [id])
  const from = rows[0]?.status as FeedbackStatus | undefined
  if (!from || !isFeedbackAction(action) || !STEPS[action].from.includes(from)) throw new Error(`Cannot ${action} from ${from ?? 'UNKNOWN'}`)
  if ((action === 'resolve' || action === 'reject') && !note?.trim()) throw new Error('Feedback resolution note is required')
  const to = STEPS[action].to
  let target: string | null = null
  if (action === 'dedupe') {
    if (!duplicateOf) throw new Error('Duplicate target is required')
    const original = await originalFeedback(connection, duplicateOf, id)
    if (!original) throw new Error('Duplicate target is not feedback')
    target = original.id
  }
  const now = Math.floor(Date.now() / 1000)
  if (target) await connection.execute('UPDATE contribution_feedback_state SET status = ?, duplicate_of = ?, updated_at = ? WHERE contribution_id = ?', [to, target, now, id])
  else if (action === 'triage') await connection.execute('UPDATE contribution_feedback_state SET status = ?, triaged_by = ?, updated_at = ? WHERE contribution_id = ?', [to, actor, now, id])
  else await connection.execute('UPDATE contribution_feedback_state SET status = ?, updated_at = ? WHERE contribution_id = ?', [to, now, id])
  await connection.execute('UPDATE contribution_feedback_workflow SET status = ? WHERE contribution_id = ?', [legacyFeedbackStatus(to), id])
  await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor, note) VALUES (?, ?, ?, ?)', [id, action.toUpperCase(), actor, target ? (note ? `${target} · ${note}` : target) : note])
  return to
}
