import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export interface StoredSetting { key: string; value: unknown; updatedBy: string; updatedAt: string }

@Injectable()
export class SettingsRepository {
  constructor(private readonly database: DatabaseService) {}

  async all(): Promise<StoredSetting[]> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT setting_key, value, updated_by, updated_at FROM app_settings')
    return rows.map((row) => ({ key: row.setting_key as string, value: row.value, updatedBy: row.updated_by as string, updatedAt: (row.updated_at as Date).toISOString() }))
  }

  async set(key: string, value: unknown, actor: string) {
    await this.database.pool.execute('INSERT INTO app_settings (setting_key, value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP', [key, JSON.stringify(value), actor])
  }

  async reset(key: string) { await this.database.pool.execute('DELETE FROM app_settings WHERE setting_key = ?', [key]) }
}
