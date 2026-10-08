import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class PasswordsRepository {
  constructor(private readonly database: DatabaseService) {}

  async hashOf(userId: string): Promise<string | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT hash FROM user_passwords WHERE user_id = ?', [userId])
    return rows.length ? rows[0].hash as string : null
  }

  async exists(userId: string) { return (await this.hashOf(userId)) !== null }

  async set(userId: string, hash: string, now: number) {
    await this.database.pool.execute('INSERT INTO user_passwords (user_id, hash, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE hash = VALUES(hash), updated_at = VALUES(updated_at)', [userId, hash, now])
  }
}
