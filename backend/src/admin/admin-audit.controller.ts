import { Controller, Get, Query } from '@nestjs/common'
import { AdminAuditRepository, type AuditTarget } from './admin-audit.repository'
import { ADMIN_PAGE_SIZE, parseChoice, parsePage, parseUuid } from './admin-input'
import { Staff } from './admin.guard'

const TARGETS: AuditTarget[] = ['user', 'contribution', 'mail', 'setting', 'role', 'ai']

@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('audit.view')
  async list(@Query() query: Record<string, unknown>) {
    const page = parsePage(query.page)
    const actorId = query.actor === undefined || query.actor === '' ? undefined : parseUuid(query.actor)
    return { ok: true, page, pageSize: ADMIN_PAGE_SIZE, ...await this.audit.list({ actorId, targetType: parseChoice(query.target, TARGETS) }, page, ADMIN_PAGE_SIZE) }
  }
}
