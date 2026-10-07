import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import { vietnamToday } from '../rules/rule-dates'
@Injectable()
export class ToolsRepository implements OnModuleInit, OnModuleDestroy {
  private cleanup?: NodeJS.Timeout
  constructor(private readonly database: DatabaseService) {}
  onModuleInit() {
    this.cleanup = setInterval(() => void this.expire().catch(() => undefined), 60000)
    this.cleanup.unref()
  }
  onModuleDestroy() { if (this.cleanup) clearInterval(this.cleanup) }
  async expire() {
    const now = Math.floor(Date.now() / 1000)
    await this.database.pool.execute('DELETE FROM visit_flood_events WHERE expires <= ?', [now])
    await this.database.pool.execute('DELETE FROM visit_flood_locks WHERE seen_at <= ?', [now - 3600])
  }
  async record(tool: string, ipHash: string, now: number): Promise<boolean> {
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      // A shared lock row makes the rolling limit atomic across API instances.
      await connection.execute('INSERT INTO visit_flood_locks (ip_hash, seen_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE seen_at = ?', [ipHash, now, now])
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) AS count FROM visit_flood_events WHERE ip_hash = ? AND expires > ?', [ipHash, now])
      const allowed = Number(rows[0].count) < 120
      if (allowed) {
        await connection.execute('INSERT INTO visit_flood_events (ip_hash, expires) VALUES (?, ?)', [ipHash, now + 3600])
        await connection.execute('INSERT INTO tool_visits (tool, count, changed) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE count = count + 1, changed = ?', [tool, now, now])
        await connection.execute('INSERT INTO tool_visit_days (day, tool, count) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1', [vietnamToday(new Date(now * 1000)), tool])
      }
      await connection.commit()
      return allowed
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
  async stats(): Promise<{ total: number; tools: Record<string, number> }> {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT tool, count FROM tool_visits ORDER BY tool')
    const tools = Object.fromEntries(rows.map(row => [row.tool as string, Number(row.count)]))
    return { total: Object.values(tools).reduce((sum, count) => sum + count, 0), tools }
  }
}
