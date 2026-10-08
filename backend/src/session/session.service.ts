import { Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { configuration } from '../config/configuration'
import { RolesRepository } from '../roles/roles.repository'
import { STAFF_SESSION_SECONDS } from '../roles/roles'
import { SessionRepository, type SessionRecord, type SessionUser } from './session.repository'

export const SESSION_COOKIE = 'cn_session'
// Sliding the expiry on every request would write once per API call; once a day is enough.
const EXTEND_AFTER_SECONDS = 86400

function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }

export function readCookie(request: FastifyRequest, name: string): string | null {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim())
  }
  return null
}

function cookie(value: string, maxAge: number) {
  const secure = configuration().auth.cookieSecure ? '; Secure' : ''
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

@Injectable()
export class SessionService {
  constructor(private readonly sessions: SessionRepository, private readonly roles: RolesRepository) {}

  /** Staff sessions never slide: EXTEND_AFTER_SECONDS is longer than their whole lifetime. */
  private lifetime(staff: boolean) { return staff ? STAFF_SESSION_SECONDS : configuration().auth.sessionDays * 86400 }

  async start(userId: string, reply: FastifyReply) {
    const token = randomBytes(32).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const lifetime = this.lifetime(Boolean(await this.roles.roleOf(userId)))
    await this.sessions.create(tokenHash(token), userId, now, now + lifetime)
    reply.header('set-cookie', cookie(token, lifetime))
  }

  /** Resolves the signed-in user; pass `reply` to let an active session slide forward. */
  async current(request: FastifyRequest, reply?: FastifyReply): Promise<SessionUser | null> {
    return (await this.currentSession(request, reply))?.user ?? null
  }

  async currentSession(request: FastifyRequest, reply?: FastifyReply): Promise<SessionRecord | null> {
    const token = readCookie(request, SESSION_COOKIE)
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
    const now = Math.floor(Date.now() / 1000)
    const session = await this.sessions.find(tokenHash(token), now)
    if (!session) return null
    if (reply && now - session.lastSeenAt >= EXTEND_AFTER_SECONDS) {
      const lifetime = this.lifetime(Boolean(session.user.role))
      await this.sessions.extend(tokenHash(token), now, now + lifetime)
      reply.header('set-cookie', cookie(token, lifetime))
    }
    return session
  }

  async end(request: FastifyRequest, reply: FastifyReply) {
    const token = readCookie(request, SESSION_COOKIE)
    if (token) await this.sessions.delete(tokenHash(token))
    reply.header('set-cookie', cookie('', 0))
  }

  async endAll(userId: string) { return this.sessions.deleteForUser(userId) }

  /** Signs the user out everywhere except the device making this request. */
  async endOthers(request: FastifyRequest, userId: string) {
    const token = readCookie(request, SESSION_COOKIE)
    return token ? this.sessions.deleteForUserExcept(userId, tokenHash(token)) : this.sessions.deleteForUser(userId)
  }
  async list(userId: string) { return this.sessions.listForUser(userId, Math.floor(Date.now() / 1000)) }
}
