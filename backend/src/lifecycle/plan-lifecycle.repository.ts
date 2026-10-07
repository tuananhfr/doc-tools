import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export type NoticeKind = 'pro_expiring' | 'cloud_purge'

// A grant still running or scheduled later; any such grant means the cloud data is not orphaned.
const HAS_FUTURE_GRANT = "EXISTS (SELECT 1 FROM user_plans f WHERE f.user_id = u.id AND f.plan = 'pro' AND f.revoked_at IS NULL AND f.ends_at > ?)"

@Injectable()
export class PlanLifecycleRepository {
  constructor(private readonly database: DatabaseService) {}

  /** Active members whose Pro (counting grants already scheduled) runs out within the window. */
  async endingBetween(now: number, until: number) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, MAX(p.ends_at) AS ends_at FROM user_plans p JOIN users u ON u.id = p.user_id
       WHERE p.plan = 'pro' AND p.revoked_at IS NULL AND p.ends_at > ? AND u.status = 'active'
       GROUP BY u.id, u.email HAVING MAX(p.ends_at) <= ? AND MIN(p.starts_at) <= ?`, [now, until, now])
    return rows.map((row) => ({ userId: row.id as string, email: row.email as string, endsAt: Number(row.ends_at) }))
  }

  /** Accounts that still hold saved items but have no Pro now or later, with the moment Pro ended. */
  async lapsedWithItems(now: number) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.status, COUNT(s.id) AS items,
         (SELECT MAX(LEAST(p.ends_at, COALESCE(p.revoked_at, p.ends_at))) FROM user_plans p WHERE p.user_id = u.id AND p.plan = 'pro') AS ended_at
       FROM saved_items s JOIN users u ON u.id = s.user_id
       WHERE NOT ${HAS_FUTURE_GRANT} GROUP BY u.id, u.email, u.status`, [now])
    return rows.map((row) => ({
      userId: row.id as string, email: row.email as string, active: row.status === 'active', items: Number(row.items),
      endedAt: row.ended_at === null ? null : Number(row.ended_at),
    }))
  }

  /** When Pro ended for one account, or null while it is Pro (now or scheduled) or never was. */
  async endedAt(userId: string, now: number) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT (SELECT MAX(LEAST(p.ends_at, COALESCE(p.revoked_at, p.ends_at))) FROM user_plans p WHERE p.user_id = u.id AND p.plan = 'pro') AS ended_at
       FROM users u WHERE u.id = ? AND NOT ${HAS_FUTURE_GRANT}`, [userId, now])
    return rows[0]?.ended_at == null ? null : Number(rows[0].ended_at)
  }

  async noticeSentAt(userId: string, kind: NoticeKind, planEnd: number) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT sent_at FROM plan_notices WHERE user_id = ? AND kind = ? AND plan_end = ?', [userId, kind, planEnd])
    return rows[0] ? Number(rows[0].sent_at) : null
  }

  /** False when another process recorded it first; only the winner queues the mail. */
  async claimNotice(userId: string, kind: NoticeKind, planEnd: number, now: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('INSERT IGNORE INTO plan_notices (user_id, kind, plan_end, sent_at) VALUES (?, ?, ?, ?)', [userId, kind, planEnd, now])
    return result.affectedRows === 1
  }

  async releaseNotice(userId: string, kind: NoticeKind, planEnd: number) {
    await this.database.pool.execute('DELETE FROM plan_notices WHERE user_id = ? AND kind = ? AND plan_end = ?', [userId, kind, planEnd])
  }

  /** Re-checks the plan in the same statement, so a renewal that lands mid-run keeps the data. */
  async purgeSaved(userId: string, now: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      `DELETE s FROM saved_items s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? AND NOT ${HAS_FUTURE_GRANT}`, [userId, now])
    return result.affectedRows
  }
}
