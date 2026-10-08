import { Injectable } from '@nestjs/common'
import type { SessionUser } from '../session/session.repository'
import { permissionsFor } from '../roles/roles'
import { capabilitiesFor } from './capabilities'
import { PasswordsRepository } from './passwords.repository'
import { PlansRepository } from './plans.repository'

@Injectable()
export class AccountsService {
  constructor(private readonly plans: PlansRepository, private readonly passwords: PasswordsRepository) {}

  /** The `/me` body; guests get the same shape with `user: null` so the site never logs a 401. */
  async me(user: SessionUser | null) {
    const endsAt = user ? await this.plans.proEndsAt(user.id, Math.floor(Date.now() / 1000)) : null
    // Accounts made before passwords existed sign in with one only after setting it through the email code.
    const hasPassword = user ? await this.passwords.exists(user.id) : false
    return {
      ok: true,
      user: user ? { id: user.id, email: user.email, displayName: user.displayName, publicAttribution: user.publicAttribution, hasPassword } : null,
      plan: { pro: endsAt !== null, endsAt: endsAt === null ? null : new Date(endsAt * 1000).toISOString() },
      capabilities: capabilitiesFor(Boolean(user), endsAt !== null),
      // Lets the site send staff to the admin area; every admin endpoint still checks on its own.
      staff: user?.role ? { role: user.role, permissions: permissionsFor(user.role) } : null,
    }
  }
}
