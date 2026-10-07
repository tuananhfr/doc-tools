import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export type SavedKind = 'result' | 'bookmark'

export interface SavedMeta { id: string; kind: SavedKind; toolId: string; title: string; size: number; rev: number; createdAt: number; updatedAt: number }
export interface SavedItem extends SavedMeta { payload: unknown }

const META = 'id, kind, tool_id, title, size_bytes, rev, created_at, updated_at'

function toMeta(row: RowDataPacket): SavedMeta {
  return {
    id: row.id as string, kind: row.kind as SavedKind, toolId: row.tool_id as string, title: row.title as string,
    size: Number(row.size_bytes), rev: Number(row.rev), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
  }
}

@Injectable()
export class SavedItemsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${META} FROM saved_items WHERE user_id = ? ORDER BY updated_at DESC, id DESC`, [userId])
    return rows.map(toMeta)
  }

  async usage(userId: string) {
    const [[row]] = await this.database.pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS items, COALESCE(SUM(size_bytes), 0) AS bytes FROM saved_items WHERE user_id = ?', [userId])
    return { items: Number(row.items), bytes: Number(row.bytes) }
  }

  async find(userId: string, id: string): Promise<SavedItem | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${META}, payload FROM saved_items WHERE id = ? AND user_id = ?`, [id, userId])
    return rows.length ? { ...toMeta(rows[0]), payload: rows[0].payload as unknown } : null
  }

  async findBookmark(userId: string, toolId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${META} FROM saved_items WHERE user_id = ? AND bookmark_tool = ?`, [userId, toolId])
    return rows.length ? toMeta(rows[0]) : null
  }

  /** Returns false when the unique key already holds this bookmark (two devices starring at once). */
  async create(userId: string, item: SavedItem, payloadJson: string | null) {
    try {
      await this.database.pool.execute(
        'INSERT INTO saved_items (id, user_id, kind, tool_id, bookmark_tool, title, payload, size_bytes, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.id, userId, item.kind, item.toolId, item.kind === 'bookmark' ? item.toolId : null, item.title, payloadJson, item.size, item.rev, item.createdAt, item.updatedAt],
      )
      return true
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return false
      throw error
    }
  }

  /** Writes only when `expectedRev` is still current, so two devices cannot both bump the same revision. */
  async update(userId: string, id: string, expectedRev: number, change: { title: string; payloadJson: string | null; size: number; updatedAt: number }) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE saved_items SET title = ?, payload = ?, size_bytes = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND user_id = ? AND rev = ?',
      [change.title, change.payloadJson, change.size, change.updatedAt, id, userId, expectedRev],
    )
    return result.affectedRows === 1
  }

  async remove(userId: string, id: string) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('DELETE FROM saved_items WHERE id = ? AND user_id = ?', [id, userId])
    return result.affectedRows === 1
  }
}
