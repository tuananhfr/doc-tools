import type { PoolConnection, RowDataPacket } from 'mysql2/promise'

export type FeedbackStatus = 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
export type ContributionAction = 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke' | 'start' | 'resolve'

export function isFeedback(domain: unknown): boolean {
  return domain === 'feedback-bug' || domain === 'feedback-improvement'
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
