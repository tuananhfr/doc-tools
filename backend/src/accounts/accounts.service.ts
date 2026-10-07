import { Injectable } from '@nestjs/common'
import type { SessionUser } from '../session/session.repository'
import { permissionsFor } from '../roles/roles'
import { capabilitiesFor } from './capabilities'
import { PlansRepository } from './plans.repository'

@Injectable()
export class AccountsService {
  constructor(private readonly plans: PlansRepository) {}

  /** The `/me` body; guests get the same shape with `user: null` so the site never logs a 401. */
  async me(user: SessionUser | null) {
    const endsAt = user ? await this.plans.proEndsAt(user.id, Math.floor(Date.now() / 1000)) : null
    return {
      ok: true,
      user: user ? { id: user.id, email: user.email, displayName: user.displayName, publicAttribution: user.publicAttribution } : null,
      plan: { pro: endsAt !== null, endsAt: endsAt === null ? null : new Date(endsAt * 1000).toISOString() },
      capabilities: capabilitiesFor(Boolean(user), endsAt !== null),
      // Lets the site send staff to the admin area; every admin endpoint still checks on its own.
      staff: user?.role ? { role: user.role, permissions: permissionsFor(user.role) } : null,
    }
  }
}
