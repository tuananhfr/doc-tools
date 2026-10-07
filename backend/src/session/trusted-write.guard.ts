import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { configuration } from '../config/configuration'

/**
 * CSRF barrier for cookie-authenticated writes. A cross-site form cannot set a custom
 * header, and a cross-site fetch that sets one needs a CORS preflight this API never grants.
 */
@Injectable()
export class TrustedWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const allowed = configuration().auth.allowedOrigins
    const origin = request.headers.origin
    const originOk = !origin || !allowed.length || allowed.includes(origin)
    if (request.headers['x-cn-request'] !== '1' || !originOk) throw new ForbiddenException({ ok: false, code: 'UNTRUSTED_REQUEST', message: 'Yêu cầu không hợp lệ. Hãy tải lại trang rồi thử lại.' })
    return true
  }
}
