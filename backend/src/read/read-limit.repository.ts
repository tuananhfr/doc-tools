import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class ReadLimitRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}
  onModuleInit() {
    this.cleanup = setInterval(() => void this.database.pool.execute('DELETE FROM read_request_limits WHERE hour < ?', [Math.floor(Date.now() / 3600000) - 1]).catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }
  /** Takes one unit of this hour's budget; false when it is spent. The row lock keeps instances from overshooting. */
  async consume(actor: string, now: number, limit: number): Promise<boolean> {
    const hour = Math.floor(now / 3600000)
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('INSERT INTO read_request_limits (actor_hash, hour, count) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE count = count', [actor, hour])
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT count FROM read_request_limits WHERE actor_hash = ? AND hour = ? FOR UPDATE', [actor, hour])
      if (Number(rows[0].count) >= limit) { await connection.rollback(); return false }
      await connection.execute('UPDATE read_request_limits SET count = count + 1 WHERE actor_hash = ? AND hour = ?', [actor, hour])
      await connection.commit()
      return true
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
