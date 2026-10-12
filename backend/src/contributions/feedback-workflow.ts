import { createHash } from 'node:crypto'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

export type FeedbackStatus = 'RECEIVED' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'RELEASED' | 'DEDUPED' | 'REJECTED'
export type ContributionAction = 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke' | 'start' | 'resolve'

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

export async function transitionFeedback(connection: PoolConnection, id: string, action: ContributionAction, actor: string, note: string | null): Promise<FeedbackStatus> {
  const [rows] = await connection.execute<RowDataPacket[]>('SELECT status FROM contribution_feedback_workflow WHERE contribution_id = ? FOR UPDATE', [id])
  const from = rows[0]?.status as FeedbackStatus | undefined
  const expected: Partial<Record<ContributionAction, FeedbackStatus[]>> = { start: ['RECEIVED'], resolve: ['IN_PROGRESS'], reject: ['RECEIVED', 'IN_PROGRESS'] }
  if (!from || !expected[action]?.includes(from)) throw new Error(`Cannot ${action} from ${from ?? 'UNKNOWN'}`)
  if ((action === 'resolve' || action === 'reject') && !note?.trim()) throw new Error('Feedback resolution note is required')
  const status = action === 'start' ? 'IN_PROGRESS' : action === 'resolve' ? 'RESOLVED' : 'REJECTED'
  await connection.execute('UPDATE contribution_feedback_workflow SET status = ? WHERE contribution_id = ?', [status, id])
  await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor, note) VALUES (?, ?, ?, ?)', [id, action.toUpperCase(), actor, note])
  return status
}
