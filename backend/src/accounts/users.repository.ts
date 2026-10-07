import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export interface UserRow { id: string; email: string; displayName: string | null; publicAttribution: boolean; status: 'active' | 'disabled'; createdAt: string; lastLoginAt: string | null }

function toUser(row: RowDataPacket): UserRow {
  return {
    id: row.id as string, email: row.email as string, displayName: row.display_name as string | null,
    publicAttribution: Boolean(row.public_attribution), status: row.status as UserRow['status'],
    createdAt: (row.created_at as Date).toISOString(), lastLoginAt: row.last_login_at ? (row.last_login_at as Date).toISOString() : null,
  }
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  /** `email` must already be normalized (`normalizeEmail`). */
  async findOrCreate(email: string): Promise<UserRow> {
    await this.database.pool.execute('INSERT IGNORE INTO users (id, email) VALUES (?, ?)', [randomUUID(), email])
    return (await this.findByEmail(email))!
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [email])
    return rows.length ? toUser(rows[0]) : null
  }

  async findById(id: string): Promise<UserRow | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id])
    return rows.length ? toUser(rows[0]) : null
  }

  async markLogin(id: string) { await this.database.pool.execute('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [id]) }

  async updateProfile(id: string, profile: { displayName: string | null; publicAttribution: boolean }) {
    await this.database.pool.execute('UPDATE users SET display_name = ?, public_attribution = ? WHERE id = ?', [profile.displayName, profile.publicAttribution ? 1 : 0, id])
  }

  async setStatus(id: string, status: UserRow['status']) {
    await this.database.pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, id])
  }

  async audit(userId: string, action: string, actor: string, note: string | null = null) {
    await this.database.pool.execute('INSERT INTO user_audit (user_id, action, actor, note) VALUES (?, ?, ?, ?)', [userId, action, actor, note])
  }
}
