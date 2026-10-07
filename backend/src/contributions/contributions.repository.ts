import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import { vietnamToday } from '../rules/rule-dates'
import { effectiveDigest, lockRulePublishing, publishPackage, unlockRulePublishing } from '../rules/rules.repository'
import type { ContributionInput, ProposedChange, SourceRef } from './contribution-input'

export type ContributionStatus = 'NEEDS_SOURCE' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'REVOKED'
/** Statuses where the submitter may still add evidence; later the reviewer already decided on what was there. */
export const EVIDENCE_OPEN: ContributionStatus[] = ['NEEDS_SOURCE', 'NEEDS_REVIEW']
export const MAX_SOURCE_REFS = 10

export interface SubmitIdentity {
  id: string; receiptHash: string; duplicateHash: string
  /** Signed-in submitters are limited per account, guests per IP; both share the flood tables. */
  floodKey: string; floodLimit: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH'; status: ContributionStatus
  submitter: { userId: string; attribution: boolean } | null
}

export interface OwnContributionRow {
  id: string; toolId: string; domain: string; status: ContributionStatus
  proposedChanges: ProposedChange[]; sourceRefs: SourceRef[]; attribution: boolean; createdAt: string
}

export type EvidenceResult = 'NOT_FOUND' | 'CLOSED' | 'TOO_MANY' | { status: ContributionStatus; sourceRefs: SourceRef[] }

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

  async submit(input: ContributionInput, identity: SubmitIdentity, now: number): Promise<'CREATED' | 'DUPLICATE' | 'RATE_LIMITED'> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      // The lock row serializes the rolling limit across API instances.
      await connection.execute('INSERT INTO contribution_flood_locks (ip_hash, seen_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE seen_at = ?', [identity.floodKey, now, now])
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM contributions WHERE duplicate_hash = ?', [identity.duplicateHash])
      if (existing.length) { await connection.commit(); return 'DUPLICATE' }
      const [events] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM contribution_flood_events WHERE ip_hash = ? AND expires > ?', [identity.floodKey, now])
      if (Number(events[0].count) >= identity.floodLimit) { await connection.commit(); return 'RATE_LIMITED' }
      await connection.execute('INSERT INTO contribution_flood_events (ip_hash, expires) VALUES (?, ?)', [identity.floodKey, now + 3600])
      const submitter = identity.submitter
      await connection.execute('INSERT INTO contributions (id, receipt_hash, duplicate_hash, tool_id, domain, risk, base_snapshot_id, proposed_changes, source_refs, jurisdiction, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [identity.id, identity.receiptHash, identity.duplicateHash, input.toolId, input.domain, identity.risk, input.baseSnapshotId, JSON.stringify(input.proposedChanges), JSON.stringify(input.sourceRefs), input.jurisdiction, identity.status])
      if (submitter) await connection.execute('INSERT INTO contribution_submitters (contribution_id, user_id, attribution_consent) VALUES (?, ?, ?)', [identity.id, submitter.userId, submitter.attribution ? 1 : 0])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor) VALUES (?, ?, ?)', [identity.id, 'SUBMITTED', submitter ? `user:${submitter.userId}` : 'anonymous'])
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

  async mine(userId: string, page: number, pageSize: number): Promise<{ items: OwnContributionRow[]; total: number }> {
    const [[{ total }]] = await this.database.pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS total FROM contribution_submitters WHERE user_id = ?', [userId])
    // LIMIT placeholders break server-side prepared statements on MySQL 8; both values are integers we built.
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT c.id, c.tool_id, c.domain, c.status, c.proposed_changes, c.source_refs, s.attribution_consent, c.created_at
       FROM contribution_submitters s JOIN contributions c ON c.id = s.contribution_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC, c.id DESC LIMIT ? OFFSET ?`, [userId, pageSize, (page - 1) * pageSize])
    return {
      total: Number(total),
      items: rows.map((row) => ({
        id: row.id as string, toolId: row.tool_id as string, domain: row.domain as string, status: row.status as ContributionStatus,
        proposedChanges: row.proposed_changes as ProposedChange[], sourceRefs: row.source_refs as SourceRef[],
        attribution: Boolean(row.attribution_consent), createdAt: (row.created_at as Date).toISOString(),
      })),
    }
  }

  /** Appends sources to the caller's own open contribution; another user's id reads as not found. */
  async addEvidence(userId: string, id: string, sources: SourceRef[]): Promise<EvidenceResult> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT c.status, c.source_refs FROM contributions c JOIN contribution_submitters s ON s.contribution_id = c.id WHERE c.id = ? AND s.user_id = ? FOR UPDATE', [id, userId])
      if (!rows.length) { await connection.commit(); return 'NOT_FOUND' }
      const from = rows[0].status as ContributionStatus
      if (!EVIDENCE_OPEN.includes(from)) { await connection.commit(); return 'CLOSED' }
      const current = rows[0].source_refs as SourceRef[]
      const added = sources.filter((source, index) => !current.some((item) => item.url === source.url) && sources.findIndex((item) => item.url === source.url) === index)
      const merged = [...current, ...added]
      if (merged.length > MAX_SOURCE_REFS) { await connection.commit(); return 'TOO_MANY' }
      if (!added.length) { await connection.commit(); return { status: from, sourceRefs: current } }
      await connection.execute('UPDATE contributions SET source_refs = ?, status = ? WHERE id = ?', [JSON.stringify(merged), 'NEEDS_REVIEW', id])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor, note) VALUES (?, ?, ?, ?)', [id, 'EVIDENCE_ADDED', `user:${userId}`, `${added.length} source(s)`])
      await connection.commit()
      return { status: 'NEEDS_REVIEW', sourceRefs: merged }
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  async getForReview(id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT c.id, c.tool_id, c.domain, c.risk, c.base_snapshot_id, c.proposed_changes, c.source_refs, c.jurisdiction, c.status, c.reviewed_by, c.approved_by, c.published_digest, c.created_at, u.email AS submitter_email, s.attribution_consent FROM contributions c LEFT JOIN contribution_submitters s ON s.contribution_id = c.id LEFT JOIN users u ON u.id = s.user_id WHERE c.id = ?', [id])
    return rows[0] ?? null
  }

  /** The name is read at view time, so turning public attribution off hides it from every past idea at once. */
  async publishedIdeas() {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT c.id, c.proposed_changes,
         CASE WHEN s.attribution_consent = 1 AND u.public_attribution = 1 AND u.status = 'active' THEN u.display_name END AS author
       FROM contributions c
       LEFT JOIN contribution_submitters s ON s.contribution_id = c.id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE c.domain = ? AND c.status = ? ORDER BY c.created_at DESC LIMIT 50`, ['ideas', 'PUBLISHED'])
    return rows.map((row) => ({ id: row.id as string, text: (row.proposed_changes as { after: string }[])[0]?.after || '', author: (row.author as string | null) || null }))
  }

  async transition(id: string, action: 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke', actor: string, note: string | null, digest: string | null) {
    const connection = await this.database.pool.getConnection()
    try {
      if (action === 'publish') await lockRulePublishing(connection)
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
            await connection.execute('SELECT id FROM rule_published WHERE kind = ? FOR UPDATE', [row.domain])
            if (await effectiveDigest(connection, row.domain, vietnamToday()) !== row.base_snapshot_id) throw new Error('Base snapshot changed; review this contribution against the active version')
          }
          const [packages] = await connection.execute<RowDataPacket[]>('SELECT digest FROM rule_packages WHERE kind = ? AND digest = ?', [row.domain, digest])
          if (!packages.length) throw new Error('Matching signed rule package must be staged first')
        }
        if (actor === row.reviewed_by || actor === row.approved_by) throw new Error('Publisher must differ from reviewer and approver')
        if (row.domain !== 'ideas') await publishPackage(connection, row.domain, digest!, actor)
      }
      const status: Record<typeof action, ContributionStatus> = { verify: 'VERIFIED', approve: 'APPROVED', reject: 'REJECTED', publish: 'PUBLISHED', supersede: 'SUPERSEDED', revoke: 'REVOKED' }
      await connection.execute('UPDATE contributions SET status = ?, reviewed_by = ?, approved_by = ?, published_digest = ? WHERE id = ?', [status[action], action === 'verify' ? actor : row.reviewed_by, action === 'approve' ? actor : row.approved_by, action === 'publish' ? digest : row.published_digest, id])
      await connection.execute('INSERT INTO contribution_audit (contribution_id, action, actor, note) VALUES (?, ?, ?, ?)', [id, action.toUpperCase(), actor, note])
      await connection.commit()
      return status[action]
    } catch (error) { await connection.rollback(); throw error }
    finally {
      if (action === 'publish') await unlockRulePublishing(connection)
      connection.release()
    }
  }
}
