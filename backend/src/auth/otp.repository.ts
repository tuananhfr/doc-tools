import { Injectable } from '@nestjs/common'
import { timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class OtpRepository {
  constructor(private readonly database: DatabaseService) {}

  /** Issuing a code voids every earlier unused code for the same email. */
  async issue(emailHash: string, codeHash: string, now: number, expiresAt: number) {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('UPDATE auth_otps SET consumed_at = ? WHERE email_hash = ? AND consumed_at IS NULL', [now, emailHash])
      await connection.execute('INSERT INTO auth_otps (email_hash, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', [emailHash, codeHash, expiresAt, now])
      await connection.execute('DELETE FROM auth_otps WHERE expires_at < ?', [now - 86400])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  /** Checks the latest live code; a wrong guess counts toward `maxAttempts`, after which the code dies. */
  async consume(emailHash: string, codeHash: string, now: number, maxAttempts: number): Promise<boolean> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id, code_hash, attempts, expires_at FROM auth_otps WHERE email_hash = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE', [emailHash])
      if (!rows.length || Number(rows[0].expires_at) <= now) { await connection.commit(); return false }
      const row = rows[0]
      if (timingSafeEqual(Buffer.from(row.code_hash as string), Buffer.from(codeHash))) {
        await connection.execute('UPDATE auth_otps SET consumed_at = ? WHERE id = ?', [now, row.id])
        await connection.commit()
        return true
      }
      const attempts = Number(row.attempts) + 1
      await connection.execute('UPDATE auth_otps SET attempts = ?, consumed_at = ? WHERE id = ?', [attempts, attempts >= maxAttempts ? now : null, row.id])
      await connection.commit()
      return false
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
