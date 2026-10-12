import type { Pool, RowDataPacket } from 'mysql2/promise'
import { feedbackKey } from '../contributions/feedback-workflow'

/**
 * Moves rows of the old one-pointer-per-kind `rule_active` table into `rule_published`, then
 * empties it so a package withdrawn later is not copied back on the next start. The unlocked
 * count skips the work on every normal start; the server and the CLI may start at the same time,
 * and a plain INSERT ... SELECT followed by DELETE deadlocks across processes.
 */
export async function migrateLegacyRuleActive(pool: Pool) {
  const [[{ pending }]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS pending FROM rule_active')
  if (!pending) return
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>('SELECT kind, digest FROM rule_active FOR UPDATE')
    for (const row of rows) await connection.execute('INSERT IGNORE INTO rule_published (kind, digest) VALUES (?, ?)', [row.kind, row.digest])
    await connection.query('DELETE FROM rule_active')
    await connection.commit()
  } catch (error) { await connection.rollback(); throw error }
  finally { connection.release() }
}

/**
 * Copies feedback rows the ENUM-only build wrote into `contribution_feedback_state` and gives each a
 * meaning-level key. Row by row with INSERT IGNORE: safe to run on every start and from the server and
 * the CLI at once (a bulk INSERT ... SELECT deadlocks across processes). Rows already copied keep their
 * newer status; rows written by an older build after a rollback are picked up on the next start.
 */
export async function migrateFeedbackState(pool: Pool) {
  const missing = 'FROM contribution_feedback_workflow w JOIN contributions c ON c.id = w.contribution_id LEFT JOIN contribution_feedback_state s ON s.contribution_id = w.contribution_id WHERE s.contribution_id IS NULL'
  // COUNT comes back as a string with bigNumberStrings; compare as a number.
  const [[{ pending }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS pending ${missing}`)
  if (Number(pending) === 0) return
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT w.contribution_id, w.status, c.tool_id, c.domain, c.proposed_changes, UNIX_TIMESTAMP(c.created_at) AS created ${missing} ORDER BY c.created_at, c.id`)
  for (const row of rows) {
    const created = Number(row.created)
    // MariaDB may hand JSON columns back as text.
    const changes = (typeof row.proposed_changes === 'string' ? JSON.parse(row.proposed_changes) : row.proposed_changes) as { after: string }[]
    await pool.execute('INSERT IGNORE INTO contribution_feedback_state (contribution_id, status, duplicate_of, triaged_by, updated_at) VALUES (?, ?, NULL, NULL, ?)', [row.contribution_id, row.status, created])
    await pool.execute('INSERT IGNORE INTO contribution_feedback_keys (feedback_key, contribution_id, created_at) VALUES (?, ?, ?)', [feedbackKey(row.tool_id as string, row.domain as string, changes), row.contribution_id, created])
  }
}
