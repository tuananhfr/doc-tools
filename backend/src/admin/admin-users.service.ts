import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { endOfVietnamDay } from '../accounts/plan-dates'
import { PlansRepository } from '../accounts/plans.repository'
import type { ProfileInput } from '../accounts/profile-input'
import { UsersRepository, type UserRow } from '../accounts/users.repository'
import { AuthService } from '../auth/auth.service'
import { EMAIL_TAKEN, EmailChangeService } from '../auth/email-change.service'
import { RolesRepository } from '../roles/roles.repository'
import { SessionService } from '../session/session.service'
import { AdminAuditRepository } from './admin-audit.repository'
import { ADMIN_PAGE_SIZE, invalid } from './admin-input'
import { AdminUsersRepository, type UserFilter } from './admin-users.repository'
import type { StaffActor } from './admin.guard'

const now = () => Math.floor(Date.now() / 1000)

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly repository: AdminUsersRepository,
    private readonly users: UsersRepository,
    private readonly plans: PlansRepository,
    private readonly roles: RolesRepository,
    private readonly sessions: SessionService,
    private readonly deletion: AccountDeletionService,
    private readonly audit: AdminAuditRepository,
    private readonly auth: AuthService,
    private readonly emailChange: EmailChangeService,
  ) {}

  async list(filter: UserFilter, page: number) {
    return { ok: true, page, pageSize: ADMIN_PAGE_SIZE, ...await this.repository.list(filter, page, ADMIN_PAGE_SIZE, now()) }
  }

  private async find(id: string): Promise<UserRow> {
    const user = await this.users.findById(id)
    if (!user) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy người dùng.' })
    return user
  }

  async detail(id: string) {
    const user = await this.find(id)
    const [role, proEndsAt, plans, sessions, contributions, userAudit, adminAudit] = await Promise.all([
      this.roles.roleOf(id), this.plans.proEndsAt(id, now()), this.plans.history(id), this.sessions.list(id),
      this.repository.contributions(id), this.repository.userAudit(id), this.audit.list({ targetType: 'user', targetId: id }, 1, 30),
    ])
    return {
      ok: true, user: { ...user, role, proEndsAt },
      plans: plans.map((row) => ({ startsAt: Number(row.starts_at), endsAt: Number(row.ends_at), revokedAt: row.revoked_at === null ? null : Number(row.revoked_at), grantedBy: row.granted_by as string, note: row.note as string | null })),
      sessions, contributions, userAudit, adminAudit: adminAudit.items,
    }
  }

  /**
   * Staff accounts are managed from the roles screen by people who can grant roles; otherwise an admin
   * could lock out the owner. Acting on yourself is refused so nobody locks themselves out by mistake.
   */
  private async target(actor: StaffActor, id: string) {
    const user = await this.find(id)
    if (user.id === actor.id) throw new ConflictException({ ok: false, code: 'SELF_TARGET', message: 'Không thao tác lên chính tài khoản của bạn ở đây.' })
    const role = await this.roles.roleOf(id)
    if (role && !actor.permissions.includes('roles.manage')) throw new ForbiddenException({ ok: false, code: 'STAFF_TARGET', message: 'Chỉ chủ hệ thống mới thao tác được trên tài khoản quản trị.' })
    if (role === 'owner' && await this.roles.countOwners() <= 1) throw new ConflictException({ ok: false, code: 'LAST_OWNER', message: 'Đây là chủ hệ thống cuối cùng.' })
    return user
  }

  async setStatus(actor: StaffActor, id: string, status: UserRow['status'], reason: string | null) {
    const user = await this.target(actor, id)
    if (user.status === status) return this.detail(id)
    await this.users.setStatus(id, status)
    // Disabled accounts already resolve to no session; dropping the rows also clears the "signed in" list.
    if (status === 'disabled') await this.sessions.endAll(id)
    await this.users.audit(id, status === 'disabled' ? 'DISABLED' : 'ENABLED', actor.label, reason)
    await this.audit.record(actor, status === 'disabled' ? 'USER_DISABLED' : 'USER_ENABLED', 'user', id, reason ? `${user.email}: ${reason}` : user.email)
    return this.detail(id)
  }

  async endSessions(actor: StaffActor, id: string) {
    const user = await this.target(actor, id)
    const ended = await this.sessions.endAll(id)
    await this.users.audit(id, 'SESSIONS_ENDED', actor.label, `${ended}`)
    await this.audit.record(actor, 'SESSIONS_ENDED', 'user', id, `${user.email}: ${ended}`)
    return this.detail(id)
  }

  async updateProfile(actor: StaffActor, id: string, input: ProfileInput) {
    const user = await this.target(actor, id)
    await this.users.updateProfile(id, input)
    await this.users.audit(id, 'PROFILE_EDITED', actor.label)
    await this.audit.record(actor, 'PROFILE_EDITED', 'user', id, `${user.email}: ${input.displayName ?? '(không tên)'}`)
    return this.detail(id)
  }

  /** Checked in this order so a typo or a taken address never costs the admin a password attempt. */
  async changeEmail(actor: StaffActor, id: string, email: string, reason: string, password: unknown) {
    const user = await this.target(actor, id)
    if (email === user.email) invalid('Đây đã là email của tài khoản.', 'EMAIL_SAME')
    if (await this.users.findByEmail(email)) throw new ConflictException(EMAIL_TAKEN)
    await this.auth.confirmPassword(actor.id, password)
    if (!await this.emailChange.changeForSupport(id, user.email, email, actor.label)) throw new ConflictException(EMAIL_TAKEN)
    await this.audit.record(actor, 'USER_EMAIL_CHANGED', 'user', id, `${user.email} → ${email}: ${reason}`)
    return this.detail(id)
  }

  async grantPro(actor: StaffActor, id: string, until: string, note: string | null) {
    const user = await this.find(id)
    let endsAt: number
    try { endsAt = endOfVietnamDay(until) } catch { invalid('Ngày hết hạn phải có dạng YYYY-MM-DD.') }
    if (endsAt <= now()) invalid('Ngày hết hạn đã qua.')
    await this.plans.grant(id, endsAt, actor.label, note, now())
    await this.users.audit(id, 'PRO_GRANTED', actor.label, `until ${until}`)
    await this.audit.record(actor, 'PRO_GRANTED', 'user', id, `${user.email}: đến ${until}${note ? ` (${note})` : ''}`)
    return this.detail(id)
  }

  async revokePro(actor: StaffActor, id: string, note: string | null) {
    const user = await this.find(id)
    const revoked = await this.plans.revoke(id, now())
    await this.users.audit(id, 'PRO_REVOKED', actor.label, note)
    await this.audit.record(actor, 'PRO_REVOKED', 'user', id, `${user.email}: ${revoked} gói${note ? ` (${note})` : ''}`)
    return this.detail(id)
  }

  async delete(actor: StaffActor, id: string, confirmEmail: unknown) {
    const user = await this.target(actor, id)
    if (confirmEmail !== user.email) invalid('Gõ đúng email của tài khoản để xác nhận xoá.', 'CONFIRM_MISMATCH')
    await this.deletion.delete(id, actor.label)
    await this.audit.record(actor, 'USER_DELETED', 'user', id, user.email)
    return { ok: true }
  }
}
