import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { ContributionStatus } from '../contributions/contributions.repository'
import type { ProposedChange, SourceRef } from '../contributions/contribution-input'

export interface ContributionFilter { status?: ContributionStatus; domain?: string; queue?: 'open' }

// What still needs a person; the review screen opens on this.
const OPEN: ContributionStatus[] = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'APPROVED']

@Injectable()
export class AdminContributionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(filter: ContributionFilter, page: number, pageSize: number) {
    const where: string[] = []
    const params: string[] = []
    if (filter.status) { where.push('c.status = ?'); params.push(filter.status) }
    else if (filter.queue) { where.push(`c.status IN (${OPEN.map(() => '?').join(', ')})`); params.push(...OPEN) }
    if (filter.domain) { where.push('c.domain = ?'); params.push(filter.domain) }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [[{ total }]] = await this.database.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM contributions c ${clause}`, params)
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT c.id, c.tool_id, c.domain, c.risk, c.status, c.proposed_changes, c.source_refs, c.created_at, u.email AS submitter_email
       FROM contributions c LEFT JOIN contribution_submitters s ON s.contribution_id = c.id LEFT JOIN users u ON u.id = s.user_id
       ${clause} ORDER BY c.created_at DESC, c.id LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize])
    return {
      total: Number(total),
      items: rows.map((row) => {
        const changes = row.proposed_changes as ProposedChange[]
        const first = changes[0]
        return {
          id: row.id as string, toolId: row.tool_id as string, domain: row.domain as string, risk: row.risk as string, status: row.status as ContributionStatus,
          submitterEmail: row.submitter_email as string | null, changeCount: changes.length, sourceCount: (row.source_refs as SourceRef[]).length,
          summary: first ? `${first.field}: ${first.after.slice(0, 160)}` : '', createdAt: (row.created_at as Date).toISOString(),
        }
      }),
    }
  }

  async domains() {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT domain, status, COUNT(*) AS total FROM contributions GROUP BY domain, status')
    return rows.map((row) => ({ domain: row.domain as string, status: row.status as ContributionStatus, total: Number(row.total) }))
  }

  async trail(id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT action, actor, note, created_at FROM contribution_audit WHERE contribution_id = ? ORDER BY id', [id])
    return rows.map((row) => ({ action: row.action as string, actor: row.actor as string, note: row.note as string | null, createdAt: (row.created_at as Date).toISOString() }))
  }
}
