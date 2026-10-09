export const ROLES = ['owner', 'admin', 'reviewer'] as const
export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  'dashboard.view', 'tools.view', 'contributions.review',
  'users.view', 'users.manage', 'plans.manage', 'mail.view', 'mail.test', 'ai.view', 'ai.manage',
  'settings.manage', 'roles.manage', 'audit.view', 'landings.manage',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const REVIEWER: Permission[] = ['dashboard.view', 'tools.view', 'contributions.review']
const ADMIN: Permission[] = [...REVIEWER, 'users.view', 'users.manage', 'plans.manage', 'mail.view', 'mail.test', 'ai.view', 'ai.manage', 'landings.manage']

/** Code checks permissions, never role names, so a new role is one line here. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  reviewer: REVIEWER,
  admin: ADMIN,
  owner: PERMISSIONS,
}

export function isRole(value: unknown): value is Role { return typeof value === 'string' && (ROLES as readonly string[]).includes(value) }

export function permissionsFor(role: Role | null): readonly Permission[] { return role ? ROLE_PERMISSIONS[role] : [] }

// Staff sessions are short so a stolen laptop or cookie gives hours, not weeks, of admin access.
export const STAFF_SESSION_SECONDS = 12 * 3600
