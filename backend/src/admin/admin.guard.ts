import { applyDecorators, ForbiddenException, Header, Injectable, SetMetadata, UnauthorizedException, UseGuards, createParamDecorator, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import { permissionsFor, STAFF_SESSION_SECONDS, type Permission, type Role } from '../roles/roles'
import { SessionService } from '../session/session.service'
import { isTrustedWrite } from '../session/trusted-write.guard'

const PERMISSION_KEY = 'adminPermission'

export interface StaffActor {
  id: string; email: string; role: Role; permissions: readonly Permission[]
  /** Written into `*_by` columns (VARCHAR(128)); emails that long do not occur in practice. */
  label: string
}

type AdminRequest = FastifyRequest & { staff?: StaffActor }

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>()
    // Reads too: an admin page is never meant to be fetched cross-site, and this keeps one rule for every route.
    if (!isTrustedWrite(request)) throw new ForbiddenException({ ok: false, code: 'UNTRUSTED_REQUEST', message: 'Yêu cầu không hợp lệ. Hãy tải lại trang rồi thử lại.' })
    const session = await this.sessions.currentSession(request)
    if (!session) throw new UnauthorizedException({ ok: false, code: 'SIGNED_OUT', message: 'Bạn cần đăng nhập.' })
    const role = session.user.role
    if (!role) throw new ForbiddenException({ ok: false, code: 'NOT_STAFF', message: 'Tài khoản này không có quyền quản trị.' })
    // Sessions opened before the role was granted keep their 30-day lifetime; staff work needs a fresh one.
    if (Math.floor(Date.now() / 1000) - session.createdAt > STAFF_SESSION_SECONDS) throw new UnauthorizedException({ ok: false, code: 'STAFF_REAUTH', message: 'Phiên quản trị đã quá 12 giờ. Hãy đăng nhập lại.' })
    const permission = this.reflector.get<Permission | undefined>(PERMISSION_KEY, context.getHandler())
    const permissions = permissionsFor(role)
    if (!permission || !permissions.includes(permission)) throw new ForbiddenException({ ok: false, code: 'FORBIDDEN', message: 'Vai trò của bạn không làm được việc này.' })
    request.staff = { id: session.user.id, email: session.user.email, role, permissions, label: session.user.email.slice(0, 128) }
    return true
  }
}

/** Every admin route declares exactly one permission; a route without one is denied. */
export function Staff(permission: Permission) {
  return applyDecorators(SetMetadata(PERMISSION_KEY, permission), UseGuards(AdminGuard), Header('Cache-Control', 'no-store'))
}

export const Actor = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AdminRequest>().staff!)
