import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export interface SessionUser { id: string; email: string; displayName: string | null; publicAttribution: boolean }
export interface SessionRecord { user: SessionUser; expiresAt: number; lastSeenAt: number }

@Injectable()
export class SessionRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}

  onModuleInit() {
    this.cleanup = setInterval(() => void this.database.pool.execute('DELETE FROM user_sessions WHERE expires_at <= ?', [Math.floor(Date.now() / 1000)]).catch(() => undefined), 3600000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }

  async create(tokenHash: string, userId: string, now: number, expiresAt: number) {
    await this.database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [tokenHash, userId, now, expiresAt, now])
  }

  /** Disabled accounts resolve to no session, so disabling takes effect on the next request. */
  async find(tokenHash: string, now: number): Promise<SessionRecord | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT s.expires_at, s.last_seen_at, u.id, u.email, u.display_name, u.public_attribution
       FROM user_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`, [tokenHash, now])
    if (!rows.length) return null
    const row = rows[0]
    return {
      user: { id: row.id as string, email: row.email as string, displayName: row.display_name as string | null, publicAttribution: Boolean(row.public_attribution) },
      expiresAt: Number(row.expires_at), lastSeenAt: Number(row.last_seen_at),
    }
  }

  async extend(tokenHash: string, now: number, expiresAt: number) {
    await this.database.pool.execute('UPDATE user_sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?', [now, expiresAt, tokenHash])
  }

  async delete(tokenHash: string) { await this.database.pool.execute('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash]) }
  async deleteForUser(userId: string) { await this.database.pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]) }
}
