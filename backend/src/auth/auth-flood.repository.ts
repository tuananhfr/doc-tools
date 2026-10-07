import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class AuthFloodRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}

  onModuleInit() {
    this.cleanup = setInterval(() => void this.expire().catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }

  async expire() {
    const now = Math.floor(Date.now() / 1000)
    await this.database.pool.execute('DELETE FROM auth_flood_events WHERE expires <= ?', [now])
    await this.database.pool.execute('DELETE FROM auth_flood_locks WHERE seen_at <= ?', [now - 86400])
  }

  /** Records one hit for `keyHash`; false when `limit` hits already fall inside the window. */
  async hit(keyHash: string, limit: number, windowSeconds: number, now: number): Promise<boolean> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      // The lock row serializes the rolling limit across API instances.
      await connection.execute('INSERT INTO auth_flood_locks (key_hash, seen_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE seen_at = ?', [keyHash, now, now])
      const [events] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM auth_flood_events WHERE key_hash = ? AND expires > ?', [keyHash, now])
      if (Number(events[0].count) >= limit) { await connection.commit(); return false }
      await connection.execute('INSERT INTO auth_flood_events (key_hash, expires) VALUES (?, ?)', [keyHash, now + windowSeconds])
      await connection.commit()
      return true
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
