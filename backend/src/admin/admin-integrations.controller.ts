import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { AuthService } from '../auth/auth.service'
import { configuration } from '../config/configuration'
import { verifySmtp } from '../mail/mail-transport'
import { IntegrationConfigService } from '../settings/integration-config.service'
import { isIntegrationGroup } from '../settings/integration.definitions'
import { AdminAuditRepository } from './admin-audit.repository'
import { body, invalid } from './admin-input'
import { Actor, Staff, type StaffActor } from './admin.guard'

function group(value: string) {
  if (!isIntegrationGroup(value)) invalid('Không có nhóm cấu hình này.')
  return value
}

function record(value: unknown) {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Body không hợp lệ.')
  return value as Record<string, unknown>
}

/**
 * Mail and GoClaw settings, owner only. Every write asks the owner's password again: a stolen staff
 * session alone must not be enough to read mail through our SMTP account or re-point GoClaw.
 */
@Controller('admin/integrations')
export class AdminIntegrationsController {
  constructor(private readonly integrations: IntegrationConfigService, private readonly auth: AuthService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('settings.manage')
  view() { return { ok: true, ...this.integrations.view() } }

  @Put(':group')
  @Staff('settings.manage')
  @RouteConfig({ bodyLimit: 8192 })
  async save(@Actor() actor: StaffActor, @Param('group') name: string, @Body() input: unknown) {
    const target = group(name)
    const payload = body(input)
    const prepared = this.integrations.prepare(target, record(payload.values), record(payload.secrets))
    await this.auth.confirmPassword(actor.id, payload.password)
    const detail = await this.integrations.apply(prepared, actor.label)
    await this.audit.record(actor, 'INTEGRATION_CHANGED', 'setting', `integration.${target}`, detail)
    return this.view()
  }

  @Delete(':group')
  @Staff('settings.manage')
  @RouteConfig({ bodyLimit: 2048 })
  async reset(@Actor() actor: StaffActor, @Param('group') name: string, @Body() input: unknown) {
    const target = group(name)
    await this.auth.confirmPassword(actor.id, body(input).password)
    await this.integrations.reset(target)
    await this.audit.record(actor, 'INTEGRATION_RESET', 'setting', `integration.${target}`)
    return this.view()
  }

  /** Logs in to the SMTP server without sending; the queue keeps working whatever this answers. */
  @Post('mail/verify')
  @HttpCode(200)
  @Staff('mail.test')
  @RouteConfig({ bodyLimit: 1024 })
  async verifyMail() {
    const { mail } = configuration()
    if (mail.transport !== 'smtp') invalid('Chỉ kiểm tra được khi gửi qua SMTP.', 'NOT_SMTP')
    return { ok: true, result: await verifySmtp(mail) }
  }

  @Post('mail/dkim')
  @HttpCode(200)
  @Staff('settings.manage')
  @RouteConfig({ bodyLimit: 2048 })
  async generateDkim(@Actor() actor: StaffActor, @Body() input: unknown) {
    const payload = body(input)
    const selector = this.integrations.dkimSelector(payload.selector)
    await this.auth.confirmPassword(actor.id, payload.password)
    const record = await this.integrations.generateDkim(selector, actor.label)
    await this.audit.record(actor, 'DKIM_GENERATED', 'setting', 'integration.mail', `selector ${record.selector}`)
    return { ok: true, record, ...this.integrations.view() }
  }
}
