import { withBase } from '@/utils/url'
import type {
  AuditRow, ContributionDetail, ContributionList, DnsCheck, MailList, Overview, Paged, RoleHolder, Setting, Staff, StaffRole,
  SystemStatus, ToolsStats, Transition, UserDetail, UserRow,
} from '../types/admin.types'

/** The admin API answers in Vietnamese already, so the message is shown as is. */
export class AdminError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function call<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1/admin' + path), {
      method,
      // Every admin route, reads included, requires the header (see backend AdminGuard).
      headers: { 'X-CN-Request': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new AdminError('NETWORK', 0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: string; message?: string } & T) | null
  if (response.ok && value?.ok) return value
  const code = typeof value?.code === 'string' ? value.code : response.status === 401 ? 'SIGNED_OUT' : 'UNKNOWN'
  throw new AdminError(code, response.status, typeof value?.message === 'string' ? value.message : `Lỗi máy chủ (${response.status}).`)
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}

export interface UserQuery { q?: string; status?: string; plan?: string; staff?: string; page: number }
export interface ContributionQuery { status?: string; domain?: string; queue?: string; page: number }

export const adminService = {
  whoami: () => call<{ staff: Staff }>('/whoami').then((value) => value.staff),
  overview: () => call<Overview>('/overview'),

  users: (params: UserQuery) => call<Paged<UserRow>>(`/users${query({ ...params })}`),
  user: (id: string) => call<UserDetail>(`/users/${id}`),
  disableUser: (id: string, reason: string) => call<UserDetail>(`/users/${id}/disable`, 'POST', { reason }),
  enableUser: (id: string) => call<UserDetail>(`/users/${id}/enable`, 'POST'),
  endSessions: (id: string) => call<UserDetail>(`/users/${id}/sessions/end`, 'POST'),
  updateProfile: (id: string, displayName: string, publicAttribution: boolean) => call<UserDetail>(`/users/${id}/profile`, 'PATCH', { displayName, publicAttribution }),
  grantPro: (id: string, until: string, note: string) => call<UserDetail>(`/users/${id}/pro`, 'POST', { until, note }),
  revokePro: (id: string, note: string) => call<UserDetail>(`/users/${id}/pro/revoke`, 'POST', { note }),
  deleteUser: (id: string, confirmEmail: string) => call<{ ok: true }>(`/users/${id}`, 'DELETE', { confirmEmail }),

  contributions: (params: ContributionQuery) => call<ContributionList>(`/contributions${query({ ...params })}`),
  contribution: (id: string) => call<ContributionDetail>(`/contributions/${id}`),
  transition: (id: string, action: Transition, note: string, digest: string) => call<{ status: string }>(`/contributions/${id}/transition`, 'POST', { action, note, digest }),

  tools: (days: number) => call<ToolsStats>(`/tools?days=${days}`),

  mail: (status: string | undefined, page: number) => call<MailList>(`/mail${query({ status, page })}`),
  mailDns: () => call<{ domain: string; checks: DnsCheck[] }>('/mail/dns'),
  sendTestMail: (to: string) => call<{ id: number }>('/mail/test', 'POST', to ? { to } : {}),

  settings: () => call<{ settings: Setting[]; system: SystemStatus }>('/settings'),
  updateSetting: (key: string, value: unknown) => call<{ settings: Setting[]; system: SystemStatus }>(`/settings/${key}`, 'PUT', { value }),
  resetSetting: (key: string) => call<{ settings: Setting[]; system: SystemStatus }>(`/settings/${key}`, 'DELETE'),

  roles: () => call<{ holders: RoleHolder[] }>('/roles'),
  grantRole: (email: string, role: StaffRole) => call<{ holders: RoleHolder[] }>('/roles', 'PUT', { email, role }),
  revokeRole: (userId: string) => call<{ holders: RoleHolder[] }>(`/roles/${userId}`, 'DELETE'),

  audit: (actor: string | undefined, target: string | undefined, page: number) => call<Paged<AuditRow>>(`/audit${query({ actor, target, page })}`),
}
