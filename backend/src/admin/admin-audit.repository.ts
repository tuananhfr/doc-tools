import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { StaffActor } from './admin.guard'

export type AuditTarget = 'user' | 'contribution' | 'mail' | 'setting' | 'role' | 'ai'

export interface AuditFilter { actorId?: string; targetType?: AuditTarget; targetId?: string }

@Injectable()
export class AdminAuditRepository {
  constructor(private readonly database: DatabaseService) {}

  async record(actor: StaffActor, action: string, targetType: AuditTarget, targetId: string | null, detail: string | null = null) {
    await this.database.pool.execute('INSERT INTO admin_audit (actor_id, actor_email, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?)', [actor.id, actor.email, action, targetType, targetId, detail?.slice(0, 1000) ?? null])
  }

  async list(filter: AuditFilter, page: number, pageSize: number) {
    const where: string[] = []
    const params: string[] = []
    if (filter.actorId) { where.push('actor_id = ?'); params.push(filter.actorId) }
    if (filter.targetType) { where.push('target_type = ?'); params.push(filter.targetType) }
    if (filter.targetId) { where.push('target_id = ?'); params.push(filter.targetId) }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [[{ total }]] = await this.database.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM admin_audit ${clause}`, params)
    const [rows] = await this.database.pool.query<RowDataPacket[]>(`SELECT id, actor_id, actor_email, action, target_type, target_id, detail, created_at FROM admin_audit ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize])
    return {
      total: Number(total),
      items: rows.map((row) => ({ id: Number(row.id), actorId: row.actor_id as string, actorEmail: row.actor_email as string, action: row.action as string, targetType: row.target_type as string, targetId: row.target_id as string | null, detail: row.detail as string | null, createdAt: (row.created_at as Date).toISOString() })),
    }
  }
}
