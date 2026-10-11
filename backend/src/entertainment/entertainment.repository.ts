import { Injectable } from '@nestjs/common'
import { createHash, createHmac } from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import { configuration } from '../config/configuration'
import { DatabaseService } from '../database/database.service'
import { drawCards } from './engines/deck-engine'
import { entError, RULE_VERSIONS, sandboxEnvelope, sessionKey } from './entertainment-policy'
import type { DeckKind, DrawInput, DrawResult, SandboxEnvelope } from './entertainment.types'

function parseSnapshot(value: unknown): SandboxEnvelope<DrawResult> {
  return (typeof value === 'string' ? JSON.parse(value) : value) as SandboxEnvelope<DrawResult>
}

@Injectable()
export class EntertainmentRepository {
  constructor(private readonly db: DatabaseService) {}
  private digest(value: string) { return createHmac('sha256', configuration().visitHashSecret).update(`ent:${value}`).digest('hex') }
  async rate(ip: string, now = Math.floor(Date.now() / 1000)) {
    const window = Math.floor(now / 60)
    const actor = this.digest(ip)
    await this.db.pool.execute('DELETE FROM ent_request_limits WHERE window_id < ?', [window - 2])
    await this.db.pool.execute('INSERT INTO ent_request_limits (actor_hash, window_id, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = hits + 1', [actor, window])
    const [rows] = await this.db.pool.execute<RowDataPacket[]>('SELECT hits FROM ent_request_limits WHERE actor_hash = ? AND window_id = ?', [actor, window])
    if (Number(rows[0]?.hits) > 30) entError(429, 'RATE_LIMITED')
  }
  async draw(kind: DeckKind, input: DrawInput, key: string, ip: string): Promise<SandboxEnvelope<DrawResult>> {
    const { expires } = sessionKey(key)
    const keyHash = this.digest(key)
    const bodyHash = createHash('sha256').update(JSON.stringify({ kind, ...input })).digest('hex')
    await this.db.pool.execute('DELETE FROM ent_draw_sessions WHERE expires_at <= ?', [Math.floor(Date.now() / 1000)])
    const read = async () => {
      const [rows] = await this.db.pool.execute<RowDataPacket[]>('SELECT request_hash, snapshot FROM ent_draw_sessions WHERE key_hash = ?', [keyHash])
      return rows[0]
    }
    const existing = await read()
    if (existing) { if (existing.request_hash !== bodyHash) entError(409, 'IDEMPOTENCY_CONFLICT'); return parseSnapshot(existing.snapshot) }
    await this.rate(ip)
    const snapshot = sandboxEnvelope(RULE_VERSIONS[kind], drawCards(kind, input, expires))
    // The unique key chooses a single immutable draw even when two retries arrive together.
    await this.db.pool.execute('INSERT IGNORE INTO ent_draw_sessions (key_hash, request_hash, snapshot, expires_at) VALUES (?, ?, ?, ?)', [keyHash, bodyHash, JSON.stringify(snapshot), expires])
    const stored = await read()
    if (!stored) entError(410, 'SESSION_EXPIRED')
    if (stored.request_hash !== bodyHash) entError(409, 'IDEMPOTENCY_CONFLICT')
    return parseSnapshot(stored.snapshot)
  }
  async report(key: string) {
    sessionKey(key)
    const [rows] = await this.db.pool.execute<RowDataPacket[]>('SELECT snapshot FROM ent_draw_sessions WHERE key_hash = ? AND expires_at > ?', [this.digest(key), Math.floor(Date.now() / 1000)])
    if (!rows[0]) entError(404, 'SESSION_NOT_FOUND')
    return parseSnapshot(rows[0].snapshot)
  }
}
