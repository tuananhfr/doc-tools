import { Controller, Get, Param, Query } from '@nestjs/common'
import { vietnamToday } from '../rules/rule-dates'
import { invalid, parseChoice } from './admin-input'
import { AdminStatsRepository, vietnamDayFrom } from './admin-stats.repository'
import { Actor, Staff, type StaffActor } from './admin.guard'

const RANGES = ['7', '30', '90'] as const

/** Consecutive Vietnam days ending today, so charts get zero-filled gaps instead of missing bars. */
function dayList(days: number) {
  const now = new Date()
  return Array.from({ length: days }, (_, index) => vietnamToday(new Date(now.getTime() - (days - 1 - index) * 86400000)))
}

function series(days: string[], values: Record<string, number>) {
  return days.map((day) => ({ day, value: values[day] ?? 0 }))
}

@Controller('admin')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsRepository) {}

  /** The admin shell calls this first: it proves the session is staff and fresh, and names the role. */
  @Get('whoami')
  @Staff('dashboard.view')
  whoami(@Actor() actor: StaffActor) {
    return { ok: true, staff: { id: actor.id, email: actor.email, role: actor.role, permissions: actor.permissions } }
  }

  @Get('overview')
  @Staff('dashboard.view')
  async overview() {
    const days = dayList(14)
    const [totals, visits, signups, tools] = await Promise.all([
      this.stats.overview(Math.floor(Date.now() / 1000)), this.stats.visitsByDay(days[0]), this.stats.signupsByDay(days[0]), this.stats.tools(vietnamDayFrom(7)),
    ])
    return { ok: true, ...totals, visits14: series(days, visits), signups14: series(days, signups), topTools7: tools.filter((tool) => tool.inRange > 0).slice(0, 5) }
  }

  @Get('tools')
  @Staff('tools.view')
  async tools(@Query('days') value: unknown) {
    const range = Number(parseChoice(value, RANGES) ?? '30')
    const days = dayList(range)
    const [tools, visits] = await Promise.all([this.stats.tools(days[0]), this.stats.visitsByDay(days[0])])
    return { ok: true, days: range, series: series(days, visits), tools }
  }

  @Get('tools/:tool')
  @Staff('tools.view')
  async tool(@Param('tool') tool: string, @Query('days') value: unknown) {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(tool)) invalid('Tên công cụ không hợp lệ.')
    const range = Number(parseChoice(value, RANGES) ?? '30')
    const days = dayList(range)
    return { ok: true, tool, days: range, series: series(days, await this.stats.toolDays(tool, days[0])) }
  }
}
