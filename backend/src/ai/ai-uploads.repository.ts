import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export interface UploadRow { id: string; userId: string; filename: string; mimeType: string; size: number; createdAt: number; expiresAt: number }

const now = () => Math.floor(Date.now() / 1000)

function toUpload(row: RowDataPacket): UploadRow {
  return { id: row.id, userId: row.user_id, filename: row.filename, mimeType: row.mime_type, size: Number(row.size_bytes), createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) }
}

@Injectable()
export class AiUploadsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(upload: UploadRow) {
    await this.database.pool.execute('INSERT INTO ai_uploads (id, user_id, filename, mime_type, size_bytes, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [upload.id, upload.userId, upload.filename, upload.mimeType, upload.size, upload.createdAt, upload.expiresAt])
  }

  /** Live uploads only: removed or expired ones are gone for their owner even before the sweep runs. */
  async find(userId: string, id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      'SELECT * FROM ai_uploads WHERE id = ? AND user_id = ? AND removed_at IS NULL AND expires_at > ?', [id, userId, now()])
    return rows.length ? toUpload(rows[0]) : null
  }

  async bytesSince(userId: string, since: number) {
    const [[row]] = await this.database.pool.execute<RowDataPacket[]>('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM ai_uploads WHERE user_id = ? AND created_at >= ?', [userId, since])
    return Number(row.total)
  }

  async setLink(id: string, hash: string, expiresAt: number) {
    await this.database.pool.execute('UPDATE ai_uploads SET link_hash = ?, link_expires_at = ? WHERE id = ?', [hash, expiresAt, id])
  }

  /** Clears the link in the same statement that checks it, so two fetches of one link cannot both win. */
  async consumeLink(id: string, hash: string) {
    const at = now()
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE ai_uploads SET link_hash = NULL, link_expires_at = NULL WHERE id = ? AND link_hash = ? AND link_expires_at > ? AND removed_at IS NULL AND expires_at > ?', [id, hash, at, at])
    if (result.affectedRows !== 1) return null
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM ai_uploads WHERE id = ?', [id])
    return rows.length ? toUpload(rows[0]) : null
  }

  async markRemoved(userId: string, id: string) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE ai_uploads SET removed_at = ?, link_hash = NULL, link_expires_at = NULL WHERE id = ? AND user_id = ? AND removed_at IS NULL', [now(), id, userId])
    return result.affectedRows === 1
  }

  async expired() {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT id FROM ai_uploads WHERE expires_at <= ? LIMIT 500', [now()])
    return rows.map((row) => row.id as string)
  }

  async idsOf(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT id FROM ai_uploads WHERE user_id = ?', [userId])
    return rows.map((row) => row.id as string)
  }

  async remove(ids: string[]) {
    if (!ids.length) return
    await this.database.pool.query('DELETE FROM ai_uploads WHERE id IN (?)', [ids])
  }
}
