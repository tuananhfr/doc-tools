import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { normalizeEmail, parseProfileInput } from '../accounts/profile-input'
import { body, invalid, parseChoice, parseNote, parsePage, parseUuid } from './admin-input'
import { AdminUsersService } from './admin-users.service'
import { Actor, Staff, type StaffActor } from './admin.guard'

@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @Staff('users.view')
  list(@Query() query: Record<string, unknown>) {
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 254) : ''
    return this.users.list({
      q: q || undefined,
      status: parseChoice(query.status, ['active', 'disabled'] as const),
      plan: parseChoice(query.plan, ['pro', 'free'] as const),
      staff: parseChoice(query.staff, ['yes'] as const),
    }, parsePage(query.page))
  }

  @Get(':id')
  @Staff('users.view')
  detail(@Param('id') id: string) { return this.users.detail(parseUuid(id)) }

  @Post(':id/disable')
  @HttpCode(200)
  @Staff('users.manage')
  @RouteConfig({ bodyLimit: 4096 })
  disable(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    return this.users.setStatus(actor, parseUuid(id), 'disabled', parseNote(body(input).reason, 500))
  }

  @Post(':id/enable')
  @HttpCode(200)
  @Staff('users.manage')
  enable(@Actor() actor: StaffActor, @Param('id') id: string) { return this.users.setStatus(actor, parseUuid(id), 'active', null) }

  @Post(':id/sessions/end')
  @HttpCode(200)
  @Staff('users.manage')
  endSessions(@Actor() actor: StaffActor, @Param('id') id: string) { return this.users.endSessions(actor, parseUuid(id)) }

  @Patch(':id/profile')
  @Staff('users.manage')
  @RouteConfig({ bodyLimit: 2048 })
  profile(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    const profile = parseProfileInput(input)
    if (!profile) invalid('Tên hiển thị không hợp lệ (tối đa 80 ký tự).')
    return this.users.updateProfile(actor, parseUuid(id), profile)
  }

  /** For someone who lost the old mailbox; they then set a password through "forgot password" at the new one. */
  @Post(':id/email')
  @HttpCode(200)
  @Staff('users.manage')
  @RouteConfig({ bodyLimit: 4096 })
  changeEmail(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    const data = body(input)
    const email = normalizeEmail(data.email)
    if (!email) invalid('Email không hợp lệ.', 'EMAIL_INVALID')
    // 300, not 500: the audit detail also carries both addresses and is capped at 1000 characters.
    const reason = parseNote(data.reason, 300, true)!
    return this.users.changeEmail(actor, parseUuid(id), email, reason, data.password)
  }

  @Post(':id/pro')
  @HttpCode(200)
  @Staff('plans.manage')
  @RouteConfig({ bodyLimit: 4096 })
  grantPro(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    const data = body(input)
    if (typeof data.until !== 'string') invalid('Thiếu ngày hết hạn.')
    return this.users.grantPro(actor, parseUuid(id), data.until, parseNote(data.note, 500))
  }

  @Post(':id/pro/revoke')
  @HttpCode(200)
  @Staff('plans.manage')
  @RouteConfig({ bodyLimit: 4096 })
  revokePro(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    return this.users.revokePro(actor, parseUuid(id), parseNote(body(input).note, 500))
  }

  @Delete(':id')
  @Staff('users.manage')
  @RouteConfig({ bodyLimit: 2048 })
  remove(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    return this.users.delete(actor, parseUuid(id), body(input).confirmEmail)
  }
}
