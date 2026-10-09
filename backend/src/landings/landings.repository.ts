import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { LandingDoc } from './landing-content'

export interface LandingSummary {
  key: string; name: string; rev: number; publishedRev: number | null
  createdAt: number; updatedAt: number; updatedBy: string; publishedAt: number | null; publishedBy: string | null
}
export interface LandingRow extends LandingSummary { draft: LandingDoc; published: LandingDoc | null }
export interface LandingAsset { id: string; mimeType: string; size: number }

const SUMMARY = 'landing_key, name, rev, published_rev, created_at, updated_at, updated_by, published_at, published_by'

function toSummary(row: RowDataPacket): LandingSummary {
  return {
    key: row.landing_key as string, name: row.name as string, rev: Number(row.rev), publishedRev: row.published_rev === null ? null : Number(row.published_rev),
    createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), updatedBy: row.updated_by as string,
    publishedAt: row.published_at === null ? null : Number(row.published_at), publishedBy: row.published_by as string | null,
  }
}

@Injectable()
export class LandingsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${SUMMARY} FROM landing_pages ORDER BY name, landing_key`)
    return rows.map(toSummary)
  }

  async find(key: string): Promise<LandingRow | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${SUMMARY}, draft, published FROM landing_pages WHERE landing_key = ?`, [key])
    return rows.length ? { ...toSummary(rows[0]), draft: rows[0].draft as LandingDoc, published: rows[0].published as LandingDoc | null } : null
  }

  async findPublished(key: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT published, published_at FROM landing_pages WHERE landing_key = ? AND published IS NOT NULL', [key])
    return rows.length ? { doc: rows[0].published as LandingDoc, publishedAt: Number(rows[0].published_at) } : null
  }

  /** Returns false when the key is already taken. */
  async create(key: string, name: string, draft: LandingDoc, actor: string, at: number) {
    try {
      await this.database.pool.execute(
        'INSERT INTO landing_pages (landing_key, name, draft, rev, created_at, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?, ?)',
        [key, name, JSON.stringify(draft), at, at, actor],
      )
      return true
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return false
      throw error
    }
  }

  /** Writes only while `expectedRev` is current, so two staff editing at once cannot both win. */
  async saveDraft(key: string, expectedRev: number, change: { name: string; draft: LandingDoc; actor: string; at: number }) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE landing_pages SET name = ?, draft = ?, rev = rev + 1, updated_at = ?, updated_by = ? WHERE landing_key = ? AND rev = ?',
      [change.name, JSON.stringify(change.draft), change.at, change.actor, key, expectedRev],
    )
    return result.affectedRows === 1
  }

  /** Copies the draft as it was at `expectedRev`: staff publish what they looked at, never a newer edit. */
  async publish(key: string, expectedRev: number, actor: string, at: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE landing_pages SET published = draft, published_rev = rev, published_at = ?, published_by = ? WHERE landing_key = ? AND rev = ?',
      [at, actor, key, expectedRev],
    )
    return result.affectedRows === 1
  }

  async unpublish(key: string) {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      'UPDATE landing_pages SET published = NULL, published_rev = NULL, published_at = NULL, published_by = NULL WHERE landing_key = ?',
      [key],
    )
    return result.affectedRows === 1
  }

  async existingAssets(ids: string[]) {
    if (!ids.length) return new Set<string>()
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT id FROM landing_assets WHERE id IN (?)', [ids])
    return new Set(rows.map((row) => row.id as string))
  }

  async findAsset(id: string): Promise<LandingAsset | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT id, mime_type, size_bytes FROM landing_assets WHERE id = ?', [id])
    return rows.length ? { id: rows[0].id as string, mimeType: rows[0].mime_type as string, size: Number(rows[0].size_bytes) } : null
  }

  /** Same bytes, same id: a repeat upload is a no-op. */
  async addAsset(asset: LandingAsset, actor: string, at: number) {
    await this.database.pool.execute(
      'INSERT IGNORE INTO landing_assets (id, mime_type, size_bytes, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [asset.id, asset.mimeType, asset.size, actor, at],
    )
  }
}
