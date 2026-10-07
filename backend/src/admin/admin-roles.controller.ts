import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Put } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { normalizeEmail } from '../accounts/profile-input'
import { UsersRepository } from '../accounts/users.repository'
import { isRole, ROLE_PERMISSIONS } from '../roles/roles'
import { RolesRepository } from '../roles/roles.repository'
import { SessionService } from '../session/session.service'
import { AdminAuditRepository } from './admin-audit.repository'
import { body, invalid, parseUuid } from './admin-input'
import { Actor, Staff, type StaffActor } from './admin.guard'

@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly roles: RolesRepository, private readonly users: UsersRepository, private readonly sessions: SessionService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('roles.manage')
  async list() { return { ok: true, holders: await this.roles.list(), permissions: ROLE_PERMISSIONS } }

  /**
   * The person must have signed in once, so a typo cannot hand a role to an address nobody controls.
   * Their sessions end, so the next sign-in gets the 12-hour staff lifetime.
   */
  @Put()
  @Staff('roles.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async grant(@Actor() actor: StaffActor, @Body() input: unknown) {
    const data = body(input)
    const email = normalizeEmail(data.email)
    if (!email) invalid('Email không hợp lệ.')
    if (!isRole(data.role)) invalid('Vai trò không hợp lệ.')
    const user = await this.users.findByEmail(email)
    if (!user) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Email này chưa có tài khoản. Người đó cần đăng nhập Chuyện Nhỏ một lần trước.' })
    if (user.id === actor.id) throw new ConflictException({ ok: false, code: 'SELF_TARGET', message: 'Không đổi vai trò của chính bạn.' })
    if (user.status !== 'active') throw new ConflictException({ ok: false, code: 'DISABLED', message: 'Tài khoản đang bị khoá.' })
    const current = await this.roles.roleOf(user.id)
    if (current === 'owner' && data.role !== 'owner' && await this.roles.countOwners() <= 1) throw new ConflictException({ ok: false, code: 'LAST_OWNER', message: 'Đây là chủ hệ thống cuối cùng.' })
    await this.roles.set(user.id, data.role, actor.label)
    if (current !== data.role) await this.sessions.endAll(user.id)
    await this.users.audit(user.id, 'ROLE_GRANTED', actor.label, data.role)
    await this.audit.record(actor, 'ROLE_GRANTED', 'role', user.id, `${email}: ${current ?? 'none'} → ${data.role}`)
    return this.list()
  }

  @Delete(':userId')
  @Staff('roles.manage')
  async revoke(@Actor() actor: StaffActor, @Param('userId') value: string) {
    const userId = parseUuid(value)
    if (userId === actor.id) throw new ConflictException({ ok: false, code: 'SELF_TARGET', message: 'Không đổi vai trò của chính bạn.' })
    const current = await this.roles.roleOf(userId)
    if (!current) return this.list()
    if (current === 'owner' && await this.roles.countOwners() <= 1) throw new ConflictException({ ok: false, code: 'LAST_OWNER', message: 'Đây là chủ hệ thống cuối cùng.' })
    const user = await this.users.findById(userId)
    await this.roles.remove(userId)
    await this.users.audit(userId, 'ROLE_REVOKED', actor.label, current)
    await this.audit.record(actor, 'ROLE_REVOKED', 'role', userId, `${user?.email ?? userId}: ${current}`)
    return this.list()
  }
}
