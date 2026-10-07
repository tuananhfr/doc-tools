import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { Role } from '../roles/roles'
import { likePattern } from './admin-input'

export interface UserFilter { q?: string; status?: 'active' | 'disabled'; plan?: 'pro' | 'free'; staff?: 'yes' }

const iso = (value: unknown) => value ? (value as Date).toISOString() : null

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(filter: UserFilter, page: number, pageSize: number, now: number) {
    const where: string[] = []
    const params: (string | number)[] = []
    if (filter.q) { where.push('(u.email LIKE ? OR u.display_name LIKE ?)'); params.push(likePattern(filter.q), likePattern(filter.q)) }
    if (filter.status) { where.push('u.status = ?'); params.push(filter.status) }
    const proExists = "EXISTS (SELECT 1 FROM user_plans p WHERE p.user_id = u.id AND p.plan = 'pro' AND p.revoked_at IS NULL AND p.starts_at <= ? AND p.ends_at > ?)"
    if (filter.plan) { where.push(filter.plan === 'pro' ? proExists : `NOT ${proExists}`); params.push(now, now) }
    if (filter.staff) where.push('r.role IS NOT NULL')
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [[{ total }]] = await this.database.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u LEFT JOIN user_roles r ON r.user_id = u.id ${clause}`, params)
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT u.id, u.email, u.display_name, u.status, u.created_at, u.last_login_at, r.role,
         (SELECT MAX(p.ends_at) FROM user_plans p WHERE p.user_id = u.id AND p.plan = 'pro' AND p.revoked_at IS NULL AND p.starts_at <= ? AND p.ends_at > ?) AS pro_ends_at,
         (SELECT COUNT(*) FROM contribution_submitters s WHERE s.user_id = u.id) AS contributions
       FROM users u LEFT JOIN user_roles r ON r.user_id = u.id ${clause}
       ORDER BY u.created_at DESC, u.id LIMIT ? OFFSET ?`, [now, now, ...params, pageSize, (page - 1) * pageSize])
    return {
      total: Number(total),
      items: rows.map((row) => ({
        id: row.id as string, email: row.email as string, displayName: row.display_name as string | null, status: row.status as string,
        role: (row.role as Role | null) ?? null, proEndsAt: row.pro_ends_at === null ? null : Number(row.pro_ends_at),
        contributions: Number(row.contributions), createdAt: iso(row.created_at)!, lastLoginAt: iso(row.last_login_at),
      })),
    }
  }

  async contributions(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT c.id, c.tool_id, c.domain, c.status, c.created_at, s.attribution_consent FROM contribution_submitters s JOIN contributions c ON c.id = s.contribution_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 20`, [userId])
    return rows.map((row) => ({ id: row.id as string, toolId: row.tool_id as string, domain: row.domain as string, status: row.status as string, attribution: Boolean(row.attribution_consent), createdAt: iso(row.created_at)! }))
  }

  async userAudit(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT action, actor, note, created_at FROM user_audit WHERE user_id = ? ORDER BY id DESC LIMIT 50', [userId])
    return rows.map((row) => ({ action: row.action as string, actor: row.actor as string, note: row.note as string | null, createdAt: iso(row.created_at)! }))
  }
}
