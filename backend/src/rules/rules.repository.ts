import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { RulePackage } from './rule-package'

@Injectable()
export class RulesRepository {
  constructor(private readonly database: DatabaseService) {}

  async getActive(kind: string): Promise<RulePackage | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      'SELECT p.signed_payload FROM rule_active a JOIN rule_packages p ON p.digest = a.digest WHERE a.kind = ? AND p.effective_from <= UTC_DATE() AND (p.effective_to IS NULL OR p.effective_to >= UTC_DATE())', [kind],
    )
    return rows.length ? rows[0].signed_payload as RulePackage : null
  }

  async getByDigest(kind: string, digest: string): Promise<RulePackage | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT signed_payload FROM rule_packages WHERE kind = ? AND digest = ?', [kind, digest])
    return rows.length ? rows[0].signed_payload as RulePackage : null
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

  async activate(kind: string, digest: string, actor: string, action: 'activate' | 'rollback') {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT digest FROM rule_packages WHERE kind = ? AND digest = ? FOR UPDATE', [kind, digest])
      if (!rows.length) throw new Error('Rule package not staged')
      await connection.execute('INSERT INTO rule_active (kind, digest) VALUES (?, ?) ON DUPLICATE KEY UPDATE digest = VALUES(digest)', [kind, digest])
      await connection.execute('INSERT INTO rule_audit (kind, digest, action, actor) VALUES (?, ?, ?, ?)', [kind, digest, action, actor])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
