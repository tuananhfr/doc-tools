import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export const MAIL_STATUSES = ['pending', 'sending', 'sent', 'failed'] as const
export type MailStatus = (typeof MAIL_STATUSES)[number]

@Injectable()
export class AdminMailRepository {
  constructor(private readonly database: DatabaseService) {}

  /** The payload column is never selected: until delivery it holds one-time codes in clear. */
  async list(status: MailStatus | undefined, page: number, pageSize: number) {
    const clause = status ? 'WHERE status = ?' : ''
    const params = status ? [status] : []
    const [[{ total }]] = await this.database.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM mail_outbox ${clause}`, params)
    const [rows] = await this.database.pool.query<RowDataPacket[]>(`SELECT id, to_email, template, status, attempts, next_attempt_at, expires_at, last_error, created_at, sent_at FROM mail_outbox ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize])
    const seconds = (value: unknown) => value === null ? null : Number(value)
    return {
      total: Number(total),
      items: rows.map((row) => ({
        id: Number(row.id), to: row.to_email as string, template: row.template as string, status: row.status as MailStatus, attempts: Number(row.attempts),
        nextAttemptAt: seconds(row.next_attempt_at), expiresAt: seconds(row.expires_at), lastError: row.last_error as string | null,
        createdAt: Number(row.created_at), sentAt: seconds(row.sent_at),
      })),
    }
  }
}
