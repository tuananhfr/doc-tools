import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { ProposedChange, SourceRef } from './contribution-input'
import type { DraftInput } from './draft-input'

export interface DraftRow {
  id: string; toolId: string; domain: string; baseSnapshotId: string | null; jurisdiction: string | null
  changes: ProposedChange[]; sources: SourceRef[]; uncertainties: string[]
  createdBy: 'agent' | 'user'; createdAt: number
}

const COLUMNS = 'id, tool_id, domain, base_snapshot_id, jurisdiction, proposed_changes, source_refs, uncertainties, created_by, created_at'

function toDraft(row: RowDataPacket): DraftRow {
  return {
    id: row.id as string, toolId: row.tool_id as string, domain: row.domain as string,
    baseSnapshotId: row.base_snapshot_id as string | null, jurisdiction: row.jurisdiction as string | null,
    changes: row.proposed_changes as ProposedChange[], sources: row.source_refs as SourceRef[], uncertainties: row.uncertainties as string[],
    createdBy: row.created_by as DraftRow['createdBy'], createdAt: Number(row.created_at),
  }
}

@Injectable()
export class ContributionDraftsRepository {
  constructor(private readonly database: DatabaseService) {}

  async countOpen(userId: string) {
    const [[row]] = await this.database.pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM contribution_drafts WHERE user_id = ? AND submitted_contribution_id IS NULL', [userId])
    return Number(row.total)
  }

  async create(id: string, userId: string, draft: DraftInput, createdBy: DraftRow['createdBy'], now: number) {
    const { contribution } = draft
    await this.database.pool.execute(
      'INSERT INTO contribution_drafts (id, user_id, tool_id, domain, base_snapshot_id, proposed_changes, source_refs, uncertainties, jurisdiction, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, contribution.toolId, contribution.domain, contribution.baseSnapshotId, JSON.stringify(contribution.proposedChanges),
        JSON.stringify(contribution.sourceRefs), JSON.stringify(draft.uncertainties), contribution.jurisdiction, createdBy, now],
    )
  }

  /** Open drafts only: once sent, the contribution itself is what the person follows. */
  async listOpen(userId: string, toolId: string | null, limit: number) {
    const filter = toolId ? ' AND tool_id = ?' : ''
    // LIMIT placeholders break server-side prepared statements on MySQL 8; `limit` is an integer we chose.
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT ${COLUMNS} FROM contribution_drafts WHERE user_id = ? AND submitted_contribution_id IS NULL${filter} ORDER BY created_at DESC, id DESC LIMIT ?`,
      toolId ? [userId, toolId, limit] : [userId, limit],
    )
    return rows.map(toDraft)
  }

  async findOpen(userId: string, id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${COLUMNS} FROM contribution_drafts WHERE id = ? AND user_id = ? AND submitted_contribution_id IS NULL`, [id, userId])
    return rows.length ? toDraft(rows[0]) : null
  }

  /** Claims the draft for one contribution id, so a double click cannot file it twice. */
  async claim(userId: string, id: string, contributionId: string) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('UPDATE contribution_drafts SET submitted_contribution_id = ? WHERE id = ? AND user_id = ? AND submitted_contribution_id IS NULL', [contributionId, id, userId])
    return result.affectedRows === 1
  }

  async release(id: string, contributionId: string) {
    await this.database.pool.execute('UPDATE contribution_drafts SET submitted_contribution_id = NULL WHERE id = ? AND submitted_contribution_id = ?', [id, contributionId])
  }

  async removeOpen(userId: string, id: string) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('DELETE FROM contribution_drafts WHERE id = ? AND user_id = ? AND submitted_contribution_id IS NULL', [id, userId])
    return result.affectedRows === 1
  }
}
