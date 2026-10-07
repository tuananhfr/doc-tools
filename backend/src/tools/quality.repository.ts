import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { QualityEvent } from './quality-input'

@Injectable()
export class QualityRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}
  onModuleInit() {
    this.cleanup = setInterval(() => void this.database.pool.execute('DELETE FROM quality_flood WHERE hour < ?', [Math.floor(Date.now() / 3600000) - 1]).catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }
  async record(event: QualityEvent, hash: string, now: number): Promise<boolean> {
    const hour = Math.floor(now / 3600), day = new Date(now * 1000).toISOString().slice(0, 10)
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.execute('INSERT INTO quality_flood (ip_hash, hour, count) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE count = count', [hash, hour])
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT count FROM quality_flood WHERE ip_hash = ? AND hour = ? FOR UPDATE', [hash, hour])
      const allowed = Number(rows[0].count) < 120
      if (allowed) {
        await connection.execute('UPDATE quality_flood SET count = count + 1 WHERE ip_hash = ? AND hour = ?', [hash, hour])
        await connection.execute('INSERT INTO quality_daily (day, event, tool, count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1', [day, event.event, event.tool])
      }
      await connection.commit()
      return allowed
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
  async report(from: string, to: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT day, event, tool, count FROM quality_daily WHERE day BETWEEN ? AND ? ORDER BY day, event, tool', [from, to])
    return rows.map(row => ({ day: String(row.day), event: String(row.event), tool: String(row.tool), count: Number(row.count) }))
  }
}
