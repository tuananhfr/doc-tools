import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class PlansRepository {
  constructor(private readonly database: DatabaseService) {}

  /** End of the Pro grant covering `now` (epoch seconds), or null when the user is not Pro. */
  async proEndsAt(userId: string, now: number): Promise<number | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      "SELECT MAX(ends_at) AS ends_at FROM user_plans WHERE user_id = ? AND plan = 'pro' AND revoked_at IS NULL AND starts_at <= ? AND ends_at > ?", [userId, now, now])
    return rows[0].ends_at === null ? null : Number(rows[0].ends_at)
  }

  async grant(userId: string, endsAt: number, actor: string, note: string | null, now: number) {
    await this.database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by, note) VALUES (?, 'pro', ?, ?, ?, ?)", [userId, now, endsAt, actor, note])
  }

  /** Revokes every grant that is still running or scheduled; returns how many were revoked. */
  async revoke(userId: string, now: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('UPDATE user_plans SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND ends_at > ?', [now, userId, now])
    return result.affectedRows
  }

  async history(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT plan, starts_at, ends_at, revoked_at, granted_by, note, created_at FROM user_plans WHERE user_id = ? ORDER BY id', [userId])
    return rows
  }

  async listActive(now: number) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT u.email, MAX(p.ends_at) AS ends_at FROM user_plans p JOIN users u ON u.id = p.user_id
       WHERE p.plan = 'pro' AND p.revoked_at IS NULL AND p.starts_at <= ? AND p.ends_at > ? GROUP BY u.email ORDER BY ends_at`, [now, now])
    return rows.map((row) => ({ email: row.email as string, endsAt: Number(row.ends_at) }))
  }
}
