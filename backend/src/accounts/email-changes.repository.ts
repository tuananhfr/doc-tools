import { Injectable } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class EmailChangesRepository {
  constructor(private readonly database: DatabaseService) {}

  /** A new request replaces the pending one, so only the latest code works. */
  async start(userId: string, newEmail: string, codeHash: string, expiresAt: number, now: number) {
    await this.database.pool.execute(
      'REPLACE INTO email_changes (user_id, new_email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)',
      [userId, newEmail, codeHash, expiresAt, now])
  }

  /** The address the code was sent to, or null; wrong guesses count toward `maxAttempts`, then the request dies. */
  async consume(userId: string, codeHash: string, now: number, maxAttempts: number): Promise<string | null> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT new_email, code_hash, attempts, expires_at FROM email_changes WHERE user_id = ? FOR UPDATE', [userId])
      if (!rows.length || Number(rows[0].expires_at) <= now) { await connection.commit(); return null }
      const row = rows[0]
      if (timingSafeEqual(Buffer.from(row.code_hash as string), Buffer.from(codeHash))) {
        await connection.execute('DELETE FROM email_changes WHERE user_id = ?', [userId])
        await connection.commit()
        return row.new_email as string
      }
      const attempts = Number(row.attempts) + 1
      if (attempts >= maxAttempts) await connection.execute('DELETE FROM email_changes WHERE user_id = ?', [userId])
      else await connection.execute('UPDATE email_changes SET attempts = ? WHERE user_id = ?', [attempts, userId])
      await connection.commit()
      return null
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  /**
   * Moves the account to `newEmail`; false when another account holds it. Codes still live for the old
   * address die with the move, and so does any pending change. Sessions are the caller's call.
   */
  async swap(userId: string, newEmail: string, oldEmailKey: string, actor: string, now: number): Promise<boolean> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      try {
        await connection.execute('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId])
      } catch (error) {
        if ((error as { code?: string }).code === 'ER_DUP_ENTRY') { await connection.rollback(); return false }
        throw error
      }
      await connection.execute('DELETE FROM email_changes WHERE user_id = ?', [userId])
      await connection.execute('UPDATE auth_otps SET consumed_at = ? WHERE email_hash = ? AND consumed_at IS NULL', [now, oldEmailKey])
      // No addresses in the note: user_audit outlives a deleted account, which must not keep its email.
      await connection.execute('INSERT INTO user_audit (user_id, action, actor) VALUES (?, ?, ?)', [userId, 'EMAIL_CHANGED', actor])
      await connection.commit()
      return true
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
