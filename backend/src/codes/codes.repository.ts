import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { CodeInput } from './codes-input'

@Injectable()
export class CodesRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}
  onModuleInit() {
    this.cleanup = setInterval(() => void this.database.pool.execute('DELETE FROM code_request_limits WHERE hour < ?', [Math.floor(Date.now() / 3600000) - 1]).catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }
  async create(input: CodeInput, id: string, publicHash: string, keyHash: string, actor: string, limit: number, now: number) {
    const connection = await this.database.pool.getConnection()
    const hour = Math.floor(now / 3600000)
    try {
      await connection.beginTransaction()
      await connection.execute('INSERT INTO code_request_limits (actor_hash, hour, count) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE count = count', [actor, hour])
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT count FROM code_request_limits WHERE actor_hash = ? AND hour = ? FOR UPDATE', [actor, hour])
      if (Number(rows[0].count) >= limit) { await connection.rollback(); return false }
      await connection.execute('INSERT INTO code_links (id, public_token_hash, manage_key_hash, destination_url, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, publicHash, keyHash, input.destinationUrl, input.expiresAt, now])
      await connection.execute('UPDATE code_request_limits SET count = count + 1 WHERE actor_hash = ? AND hour = ?', [actor, hour])
      await connection.commit()
      return true
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
  async resolve(hash: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT destination_url, expires_at, revoked_at FROM code_links WHERE public_token_hash = ?', [hash])
    return rows[0] ?? null
  }
  async managementHash(id: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT manage_key_hash FROM code_links WHERE id = ?', [id])
    return typeof rows[0]?.manage_key_hash === 'string' ? rows[0].manage_key_hash : null
  }
  async revoke(id: string, now: number) {
    const [result] = await this.database.pool.execute<ResultSetHeader>('UPDATE code_links SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?', [now, id])
    return result.affectedRows > 0
  }
}
