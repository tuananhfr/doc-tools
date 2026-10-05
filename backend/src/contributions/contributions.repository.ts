import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { ContributionInput, SourceRef } from './contribution-input'

export type ContributionStatus = 'NEEDS_SOURCE' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'REVOKED'

@Injectable()
export class ContributionsRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}

  onModuleInit() {
    this.cleanup = setInterval(() => void this.expire().catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }
  async expire() {
    const now = Math.floor(Date.now() / 1000)
    await this.database.pool.execute('DELETE FROM contribution_flood_events WHERE expires <= ?', [now])
    await this.database.pool.execute('DELETE FROM contribution_flood_locks WHERE seen_at <= ?', [now - 3600])
  }

  async submit(input: ContributionInput, identity: { id: string; receiptHash: string; duplicateHash: string; ipHash: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'; status: ContributionStatus }, now: number): Promise<'CREATED' | 'DUPLICATE' | 'RATE_LIMITED'> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      // The lock row serializes the rolling limit across API instances.
      await connection.execute('INSERT INTO contribution_flood_locks (ip_hash, seen_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE seen_at = ?', [identity.ipHash, now, now])
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM contributions WHERE duplicate_hash = ?', [identity.duplicateHash])
      if (existing.length) { await connection.commit(); return 'DUPLICATE' }
      const [events] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM contribution_flood_events WHERE ip_hash = ? AND expires > ?', [identity.ipHash, now])
      if (Number(events[0].count) >= 5) { await connection.commit(); return 'RATE_LIMITED' }
      await connection.execute('INSERT INTO contribution_flood_events (ip_hash, expires) VALUES (?, ?)', [identity.ipHash, now + 3600])
      await connection.execute('INSERT INTO contributions (id, receipt_hash, duplicate_hash, tool_id, domain, risk, base_snapshot_id, proposed_changes, source_refs, jurisdiction, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [identity.id, identity.receiptHash, identity.duplicateHash, input.toolId, input.domain, identity.risk, input.baseSnapshotId, JSON.stringify(input.proposedChanges), JSON.stringify(input.sourceRefs), input.jurisdiction, identity.status])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor) VALUES (?, ?, ?)', [identity.id, 'SUBMITTED', 'anonymous'])
      await connection.commit()
      return 'CREATED'
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  async status(receiptHash: string): Promise<{ status: ContributionStatus; createdAt: string } | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT status, created_at FROM contributions WHERE receipt_hash = ?', [receiptHash])
    if (!rows.length) return null
    return { status: rows[0].status as ContributionStatus, createdAt: (rows[0].created_at as Date).toISOString() }
  }

  async addSources(receiptHash: string, sources: SourceRef[]): Promise<boolean> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT id, status FROM contributions WHERE receipt_hash = ? FOR UPDATE', [receiptHash])
      if (!rows.length || rows[0].status !== 'NEEDS_SOURCE') { await connection.commit(); return false }
      await connection.execute('UPDATE contributions SET source_refs = ?, status = ? WHERE id = ?', [JSON.stringify(sources), 'NEEDS_REVIEW', rows[0].id])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor) VALUES (?, ?, ?)', [rows[0].id, 'SOURCES_ADDED', 'receipt-holder'])
      await connection.commit()
      return true
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  async getForReview(id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT id, tool_id, domain, risk, base_snapshot_id, proposed_changes, source_refs, jurisdiction, status, reviewed_by, approved_by, published_digest, created_at FROM contributions WHERE id = ?', [id])
    return rows[0] ?? null
  }

  async publishedIdeas() {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT id, proposed_changes FROM contributions WHERE domain = ? AND status = ? ORDER BY created_at DESC LIMIT 50', ['ideas', 'PUBLISHED'])
    return rows.map((row) => ({ id: row.id as string, text: (row.proposed_changes as { after: string }[])[0]?.after || '' }))
  }

  async transition(id: string, action: 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke', actor: string, note: string | null, digest: string | null) {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM contributions WHERE id = ? FOR UPDATE', [id])
      if (!rows.length) throw new Error('Contribution not found')
      const row = rows[0]
      const from = row.status as ContributionStatus
      const expected: Record<typeof action, ContributionStatus[]> = { verify: ['NEEDS_REVIEW'], approve: ['VERIFIED'], reject: ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED'], publish: ['APPROVED'], supersede: ['PUBLISHED'], revoke: ['PUBLISHED'] }
      if (!expected[action].includes(from)) throw new Error(`Cannot ${action} from ${from}`)
      if (action === 'verify') {
        const refs = row.source_refs as { type: string }[]
        if (!refs.length && row.domain !== 'ideas') throw new Error('Source references required')
        if (row.risk === 'HIGH' && !refs.some((ref) => ref.type.startsWith('OFFICIAL_'))) throw new Error('High-risk contribution requires an official source reference')
        if (!note || note.length < 10) throw new Error('Verification note is required')
      }
      if (action === 'approve' && actor === row.reviewed_by) throw new Error('Approver must differ from reviewer')
      if (action === 'publish') {
        if (row.domain !== 'ideas') {
          if (!digest) throw new Error('Signed rule package digest is required')
          if (row.base_snapshot_id) {
            const [active] = await connection.execute<RowDataPacket[]>('SELECT digest FROM rule_active WHERE kind = ? FOR UPDATE', [row.domain])
            if (active[0]?.digest !== row.base_snapshot_id) throw new Error('Base snapshot changed; review this contribution against the active version')
          }
          const [packages] = await connection.execute<RowDataPacket[]>('SELECT digest FROM rule_packages WHERE kind = ? AND digest = ?', [row.domain, digest])
          if (!packages.length) throw new Error('Matching signed rule package must be staged first')
        }
        if (actor === row.reviewed_by || actor === row.approved_by) throw new Error('Publisher must differ from reviewer and approver')
        if (row.domain !== 'ideas') {
          await connection.execute('INSERT INTO rule_active (kind, digest) VALUES (?, ?) ON DUPLICATE KEY UPDATE digest = VALUES(digest)', [row.domain, digest])
          await connection.execute('INSERT INTO rule_audit (kind, digest, action, actor) VALUES (?, ?, ?, ?)', [row.domain, digest, 'activate', actor])
        }
      }
      const status: Record<typeof action, ContributionStatus> = { verify: 'VERIFIED', approve: 'APPROVED', reject: 'REJECTED', publish: 'PUBLISHED', supersede: 'SUPERSEDED', revoke: 'REVOKED' }
      await connection.execute('UPDATE contributions SET status = ?, reviewed_by = ?, approved_by = ?, published_digest = ? WHERE id = ?', [status[action], action === 'verify' ? actor : row.reviewed_by, action === 'approve' ? actor : row.approved_by, action === 'publish' ? digest : row.published_digest, id])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor, note) VALUES (?, ?, ?, ?)', [id, action.toUpperCase(), actor, note])
      await connection.commit()
      return status[action]
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
