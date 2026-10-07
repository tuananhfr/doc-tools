import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { normalizeEmail } from '../accounts/profile-input'
import { configuration } from '../config/configuration'
import { MailService } from '../mail/mail.service'
import { AdminAuditRepository } from './admin-audit.repository'
import { ADMIN_PAGE_SIZE, body, invalid, parseChoice, parsePage } from './admin-input'
import { AdminMailRepository, MAIL_STATUSES } from './admin-mail.repository'
import { Actor, Staff, type StaffActor } from './admin.guard'
import { checkMailDns } from './mail-dns'
import { systemStatus } from './system-status'

@Controller('admin/mail')
export class AdminMailController {
  constructor(private readonly outbox: AdminMailRepository, private readonly mail: MailService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('mail.view')
  async list(@Query() query: Record<string, unknown>) {
    const page = parsePage(query.page)
    return { ok: true, page, pageSize: ADMIN_PAGE_SIZE, ...await this.outbox.list(parseChoice(query.status, MAIL_STATUSES), page, ADMIN_PAGE_SIZE), config: systemStatus().mail }
  }

  @Get('dns')
  @Staff('mail.view')
  async dns() {
    const { dkim } = configuration().mail
    return { ok: true, domain: dkim.domain, checks: await checkMailDns(dkim.domain, dkim.selector || null) }
  }

  /** Goes through the real queue and transport, so the outbox row shows exactly what production would do. */
  @Post('test')
  @HttpCode(200)
  @Staff('mail.test')
  @RouteConfig({ bodyLimit: 1024 })
  async test(@Actor() actor: StaffActor, @Body() input: unknown) {
    const to = body(input).to === undefined ? actor.email : normalizeEmail(body(input).to)
    if (!to) invalid('Email không hợp lệ.')
    const id = await this.mail.enqueue(to, 'test', { requestedBy: actor.email, at: new Date().toISOString() })
    await this.audit.record(actor, 'MAIL_TEST', 'mail', String(id), to)
    return { ok: true, id }
  }
}
