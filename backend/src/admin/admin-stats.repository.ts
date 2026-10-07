import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import { vietnamToday } from '../rules/rule-dates'

/** Vietnam calendar day `days - 1` days before today, inclusive range start. */
export function vietnamDayFrom(days: number, now = new Date()) {
  return vietnamToday(new Date(now.getTime() - (days - 1) * 86400000))
}

@Injectable()
export class AdminStatsRepository {
  constructor(private readonly database: DatabaseService) {}

  private async one(sql: string, params: (string | number)[] = []) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>(sql, params)
    return rows[0]
  }

  async overview(now: number) {
    const users = await this.one(`SELECT COUNT(*) AS total,
      SUM(created_at >= NOW() - INTERVAL 7 DAY) AS new7, SUM(created_at >= NOW() - INTERVAL 30 DAY) AS new30,
      SUM(last_login_at >= NOW() - INTERVAL 7 DAY) AS active7, SUM(status = 'disabled') AS disabled FROM users`)
    const pro = await this.one(`SELECT COUNT(*) AS active, SUM(ends_at <= ?) AS expiring7 FROM (
      SELECT user_id, MAX(ends_at) AS ends_at FROM user_plans WHERE plan = 'pro' AND revoked_at IS NULL AND starts_at <= ? AND ends_at > ? GROUP BY user_id) AS active`, [now + 7 * 86400, now, now])
    const [contributionRows] = await this.database.pool.query<RowDataPacket[]>('SELECT status, COUNT(*) AS total FROM contributions GROUP BY status')
    const [mailRows] = await this.database.pool.query<RowDataPacket[]>('SELECT status, COUNT(*) AS total FROM mail_outbox WHERE created_at >= ? GROUP BY status', [now - 7 * 86400])
    const staff = await this.one('SELECT COUNT(*) AS total FROM user_roles')
    const toNumber = (value: unknown) => Number(value ?? 0)
    return {
      users: { total: toNumber(users.total), new7: toNumber(users.new7), new30: toNumber(users.new30), active7: toNumber(users.active7), disabled: toNumber(users.disabled), staff: toNumber(staff.total) },
      pro: { active: toNumber(pro.active), expiring7: toNumber(pro.expiring7) },
      contributions: Object.fromEntries(contributionRows.map((row) => [row.status as string, Number(row.total)])),
      mail7: Object.fromEntries(mailRows.map((row) => [row.status as string, Number(row.total)])),
    }
  }

  /** Grouped in JS by Vietnam day: CONVERT_TZ needs time zone tables that a plain MySQL install lacks. */
  async signupsByDay(fromDay: string) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT created_at FROM users WHERE created_at >= ?', [new Date(Date.parse(`${fromDay}T00:00:00+07:00`))])
    const days: Record<string, number> = {}
    for (const row of rows) {
      const day = vietnamToday(row.created_at as Date)
      days[day] = (days[day] ?? 0) + 1
    }
    return days
  }

  async visitsByDay(fromDay: string) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT day, SUM(count) AS total FROM tool_visit_days WHERE day >= ? GROUP BY day', [fromDay])
    return Object.fromEntries(rows.map((row) => [row.day as string, Number(row.total)]))
  }

  /** Every tool ever counted, with its total in the range and all time. */
  async tools(fromDay: string) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT v.tool, v.count AS all_time, COALESCE(d.total, 0) AS in_range, v.changed
       FROM tool_visits v LEFT JOIN (SELECT tool, SUM(count) AS total FROM tool_visit_days WHERE day >= ? GROUP BY tool) d ON d.tool = v.tool
       ORDER BY in_range DESC, all_time DESC, v.tool`, [fromDay])
    return rows.map((row) => ({ tool: row.tool as string, inRange: Number(row.in_range), allTime: Number(row.all_time), lastVisitAt: Number(row.changed) || null }))
  }

  async toolDays(tool: string, fromDay: string) {
    const [rows] = await this.database.pool.query<RowDataPacket[]>('SELECT day, count FROM tool_visit_days WHERE tool = ? AND day >= ?', [tool, fromDay])
    return Object.fromEntries(rows.map((row) => [row.day as string, Number(row.count)]))
  }
}
