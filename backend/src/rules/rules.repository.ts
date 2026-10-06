import { Injectable } from '@nestjs/common'
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { RulePackage } from './rule-package'

export interface ScheduledPackage { digest: string; effectiveFrom: string; effectiveTo: string | null; stagedAt: Date; publishedAt: Date | null }

type Queryable = Pick<PoolConnection, 'execute'>

// Among published packages valid on `today`, the latest effective date wins; a re-publish breaks ties.
const EFFECTIVE = `SELECT p.digest, p.signed_payload FROM rule_published r JOIN rule_packages p ON p.digest = r.digest AND p.kind = r.kind
  WHERE r.kind = ? AND p.effective_from <= ? AND (p.effective_to IS NULL OR p.effective_to >= ?)
  ORDER BY p.effective_from DESC, r.id DESC LIMIT 1`

export async function effectiveDigest(connection: Queryable, kind: string, today: string): Promise<string | null> {
  const [rows] = await connection.execute<RowDataPacket[]>(EFFECTIVE, [kind, today, today])
  return rows.length ? rows[0].digest as string : null
}

// In REPEATABLE READ, a DELETE or locking read that finds no row gap-locks rule_published's unique
// key, and that gap is shared with neighbouring kinds, so two publishes deadlock each other.
// Publishing is rare: serialise every publish/withdraw on one named lock per database.
const PUBLISH_LOCK = "CONCAT(DATABASE(), '.rule_publish')"

export async function lockRulePublishing(connection: Pick<PoolConnection, 'query'>) {
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT GET_LOCK(${PUBLISH_LOCK}, 10) AS acquired`)
  // The pool returns BIGINT as a string.
  if (Number(rows[0].acquired) !== 1) throw new Error('Another rule publish is in progress; try again')
}

export async function unlockRulePublishing(connection: Pick<PoolConnection, 'query'>) {
  await connection.query(`SELECT RELEASE_LOCK(${PUBLISH_LOCK})`)
}

/** Shared with contribution publishing so both paths stay one transaction with their own audit rows. */
export async function publishPackage(connection: Queryable, kind: string, digest: string, actor: string) {
  const [rows] = await connection.execute<RowDataPacket[]>('SELECT digest FROM rule_packages WHERE kind = ? AND digest = ? FOR UPDATE', [kind, digest])
  if (!rows.length) throw new Error('Rule package not staged')
  // Re-inserting gives a fresh id, so re-publishing an older package makes it win a tie on the same effective date.
  await connection.execute('DELETE FROM rule_published WHERE kind = ? AND digest = ?', [kind, digest])
  await connection.execute('INSERT INTO rule_published (kind, digest) VALUES (?, ?)', [kind, digest])
  await connection.execute('INSERT INTO rule_audit (kind, digest, action, actor) VALUES (?, ?, ?, ?)', [kind, digest, 'activate', actor])
}

@Injectable()
export class RulesRepository {
  constructor(private readonly database: DatabaseService) {}

  async getEffective(kind: string, today: string): Promise<RulePackage | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(EFFECTIVE, [kind, today, today])
    return rows.length ? rows[0].signed_payload as RulePackage : null
  }

  async getUpcoming(kind: string, today: string): Promise<RulePackage | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT p.signed_payload FROM rule_published r JOIN rule_packages p ON p.digest = r.digest AND p.kind = r.kind
        WHERE r.kind = ? AND p.effective_from > ? ORDER BY p.effective_from ASC, r.id DESC LIMIT 1`, [kind, today],
    )
    return rows.length ? rows[0].signed_payload as RulePackage : null
  }

  async getByDigest(kind: string, digest: string): Promise<RulePackage | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT signed_payload FROM rule_packages WHERE kind = ? AND digest = ?', [kind, digest])
    return rows.length ? rows[0].signed_payload as RulePackage : null
  }

  async schedule(kind: string): Promise<ScheduledPackage[]> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT p.digest, DATE_FORMAT(p.effective_from, '%Y-%m-%d') AS effective_from, DATE_FORMAT(p.effective_to, '%Y-%m-%d') AS effective_to, p.created_at, r.published_at
        FROM rule_packages p LEFT JOIN rule_published r ON r.digest = p.digest AND r.kind = p.kind
        WHERE p.kind = ? ORDER BY p.effective_from, p.created_at`, [kind],
    )
    return rows.map(row => ({ digest: row.digest, effectiveFrom: row.effective_from, effectiveTo: row.effective_to, stagedAt: row.created_at, publishedAt: row.published_at }))
  }

  async stage(item: RulePackage, digest: string, actor: string) {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('INSERT IGNORE INTO rule_packages (digest, kind, effective_from, effective_to, signed_payload) VALUES (?, ?, ?, ?, ?)', [digest, item.kind, item.effectiveFrom, item.effectiveTo ?? null, JSON.stringify(item)])
      await connection.execute('INSERT INTO rule_audit (kind, digest, action, actor) VALUES (?, ?, ?, ?)', [item.kind, digest, 'stage', actor])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  /** Publishes a staged package; a future effective date schedules it instead of applying it now. */
  async publish(kind: string, digest: string, actor: string) {
    const connection = await this.database.pool.getConnection()
    try {
      await lockRulePublishing(connection)
      await connection.beginTransaction()
      await publishPackage(connection, kind, digest, actor)
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { await unlockRulePublishing(connection); connection.release() }
  }

  /** Withdraws a published package; whichever earlier package is still in effect applies again. */
  async withdraw(kind: string, digest: string, actor: string) {
    const connection = await this.database.pool.getConnection()
    try {
      await lockRulePublishing(connection)
      await connection.beginTransaction()
      const [result] = await connection.execute<ResultSetHeader>('DELETE FROM rule_published WHERE kind = ? AND digest = ?', [kind, digest])
      if (!result.affectedRows) throw new Error('Rule package is not published')
      await connection.execute('INSERT INTO rule_audit (kind, digest, action, actor) VALUES (?, ?, ?, ?)', [kind, digest, 'rollback', actor])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { await unlockRulePublishing(connection); connection.release() }
  }
}
