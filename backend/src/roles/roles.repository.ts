import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import { isRole, type Role } from './roles'

export interface RoleHolder { userId: string; email: string; displayName: string | null; role: Role; grantedBy: string; grantedAt: string }

@Injectable()
export class RolesRepository {
  constructor(private readonly database: DatabaseService) {}

  async roleOf(userId: string): Promise<Role | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT role FROM user_roles WHERE user_id = ?', [userId])
    return rows.length && isRole(rows[0].role) ? rows[0].role : null
  }

  async set(userId: string, role: Role, grantedBy: string) {
    await this.database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), granted_by = VALUES(granted_by), granted_at = CURRENT_TIMESTAMP', [userId, role, grantedBy])
  }

  async remove(userId: string) { await this.database.pool.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]) }

  async countOwners() {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM user_roles r JOIN users u ON u.id = r.user_id WHERE r.role = 'owner' AND u.status = 'active'")
    return Number(rows[0].total)
  }

  async list(): Promise<RoleHolder[]> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT r.user_id, u.email, u.display_name, r.role, r.granted_by, r.granted_at FROM user_roles r JOIN users u ON u.id = r.user_id ORDER BY FIELD(r.role, \'owner\', \'admin\', \'reviewer\'), u.email')
    return rows.map((row) => ({ userId: row.user_id as string, email: row.email as string, displayName: row.display_name as string | null, role: row.role as Role, grantedBy: row.granted_by as string, grantedAt: (row.granted_at as Date).toISOString() }))
  }
}
