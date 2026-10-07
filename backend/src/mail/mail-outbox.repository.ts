import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { MailTemplate } from './mail-templates'

export interface OutboxRow { id: number; toEmail: string; template: MailTemplate; payload: unknown; attempts: number; expiresAt: number | null }

/** Seconds to wait before attempt n+1; the length is the maximum number of attempts minus one. */
export const RETRY_DELAYS = [60, 300, 1800, 7200, 21600]
// A worker that crashed mid-send leaves rows in `sending`; another worker reclaims them after this.
const STALE_CLAIM_SECONDS = 300

@Injectable()
export class MailOutboxRepository {
  constructor(private readonly database: DatabaseService) {}

  async enqueue(to: string, template: MailTemplate, payload: unknown, expiresAt: number | null, now: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('INSERT INTO mail_outbox (to_email, template, payload, next_attempt_at, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)', [to, template, JSON.stringify(payload), now, expiresAt, now])
    return result.insertId
  }

  async claim(now: number, limit: number): Promise<OutboxRow[]> {
    const token = randomBytes(16).toString('hex')
    await this.database.pool.execute(
      `UPDATE mail_outbox SET status = 'sending', claim_token = ?, claimed_at = ?
       WHERE (status = 'pending' AND next_attempt_at <= ?) OR (status = 'sending' AND claimed_at < ?)
       ORDER BY id LIMIT ${Number(limit)}`, [token, now, now, now - STALE_CLAIM_SECONDS])
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT id, to_email, template, payload, attempts, expires_at FROM mail_outbox WHERE claim_token = ? AND status = ?', [token, 'sending'])
    return rows.map((row) => ({ id: Number(row.id), toEmail: row.to_email as string, template: row.template as MailTemplate, payload: row.payload, attempts: Number(row.attempts), expiresAt: row.expires_at === null ? null : Number(row.expires_at) }))
  }

  async markSent(id: number, now: number) {
    await this.database.pool.execute("UPDATE mail_outbox SET status = 'sent', payload = '{}', sent_at = ?, claim_token = NULL, last_error = NULL WHERE id = ?", [now, id])
  }

  /** Returns the resulting status: `pending` when another attempt is scheduled. */
  async markFailed(row: OutboxRow, error: string, permanent: boolean, now: number): Promise<'pending' | 'failed'> {
    const attempts = row.attempts + 1
    const message = error.slice(0, 500)
    if (permanent || attempts > RETRY_DELAYS.length) {
      await this.database.pool.execute("UPDATE mail_outbox SET status = 'failed', payload = '{}', attempts = ?, last_error = ?, claim_token = NULL WHERE id = ?", [attempts, message, row.id])
      return 'failed'
    }
    await this.database.pool.execute("UPDATE mail_outbox SET status = 'pending', attempts = ?, next_attempt_at = ?, last_error = ?, claim_token = NULL WHERE id = ?", [attempts, now + RETRY_DELAYS[attempts - 1], message, row.id])
    return 'pending'
  }

  async status(id: number) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT status, attempts, last_error, payload FROM mail_outbox WHERE id = ?', [id])
    return rows[0] ? { status: rows[0].status as string, attempts: Number(rows[0].attempts), lastError: rows[0].last_error as string | null, payload: rows[0].payload } : null
  }

  async cleanup(now: number) {
    await this.database.pool.execute("DELETE FROM mail_outbox WHERE status IN ('sent', 'failed') AND created_at < ?", [now - 30 * 86400])
  }
}
