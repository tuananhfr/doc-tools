import type { LandingDoc } from '@/features/site-landing'
import { withBase } from '@/utils/url'
import type {
  AiAccountList, AiStatus, AuditRow, ContributionDetail, ContributionList, DkimRecord, DnsCheck, IntegrationGroup, Integrations, LandingDetail, LandingSummary, MailList, Overview, Paged, RoleHolder,
  Setting, Staff, StaffRole, SystemStatus, ToolsStats, Transition, UserDetail, UserRow,
} from '../types/admin.types'

/** The admin API answers in Vietnamese already, so the message is shown as is. */
export class AdminError extends Error {
  /** `field` names the invalid input (e.g. "hero.title") so a form can point at it. */
  constructor(readonly code: string, readonly status: number, message: string, readonly field?: string) {
    super(message)
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function send<T>(path: string, method: Method, body: BodyInit | undefined, headers: Record<string, string>): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1/admin' + path), {
      method,
      // Every admin route, reads included, requires the header (see backend AdminGuard).
      headers: { 'X-CN-Request': '1', ...headers },
      body,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch {
    throw new AdminError('NETWORK', 0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: string; message?: string; field?: string } & T) | null
  if (response.ok && value?.ok) return value
  const code = typeof value?.code === 'string' ? value.code : response.status === 401 ? 'SIGNED_OUT' : 'UNKNOWN'
  throw new AdminError(code, response.status, typeof value?.message === 'string' ? value.message : `Lỗi máy chủ (${response.status}).`, typeof value?.field === 'string' ? value.field : undefined)
}

function call<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  return body === undefined ? send<T>(path, method, undefined, {}) : send<T>(path, method, JSON.stringify(body), { 'Content-Type': 'application/json' })
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}

export interface UserQuery { q?: string; status?: string; plan?: string; staff?: string; page: number }
export interface AiQuery { q?: string; status?: string; page: number }
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
  changeEmail: (id: string, email: string, reason: string, password: string) => call<UserDetail>(`/users/${id}/email`, 'POST', { email, reason, password }),
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

  integrations: () => call<Integrations>('/integrations'),
  saveIntegration: (group: IntegrationGroup, password: string, values: object, secrets: Record<string, string | null>) => call<Integrations>(`/integrations/${group}`, 'PUT', { password, values, secrets }),
  resetIntegration: (group: IntegrationGroup, password: string) => call<Integrations>(`/integrations/${group}`, 'DELETE', { password }),
  verifySmtp: () => call<{ result: { ok: boolean; error: string | null } }>('/integrations/mail/verify', 'POST'),
  generateDkim: (password: string, selector: string) => call<Integrations & { record: DkimRecord & { selector: string } }>('/integrations/mail/dkim', 'POST', { password, selector }),

  roles: () => call<{ holders: RoleHolder[] }>('/roles'),
  grantRole: (email: string, role: StaffRole) => call<{ holders: RoleHolder[] }>('/roles', 'PUT', { email, role }),
  revokeRole: (userId: string) => call<{ holders: RoleHolder[] }>(`/roles/${userId}`, 'DELETE'),

  aiAccounts: (params: AiQuery) => call<AiAccountList>(`/ai${query({ ...params })}`),
  aiStatus: () => call<AiStatus>('/ai/status'),
  disableAi: (userId: string) => call<{ ok: true }>(`/ai/${userId}/disable`, 'POST'),
  enableAi: (userId: string) => call<{ ok: true }>(`/ai/${userId}/enable`, 'POST'),
  registerMcp: () => call<{ action: 'created' | 'updated'; url: string; serverName: string }>('/ai/mcp/register', 'POST'),
  syncAgents: () => call<{ promptVersion: number; updated: number; failed: string[] }>('/ai/agents/sync', 'POST'),

  audit: (actor: string | undefined, target: string | undefined, page: number) => call<Paged<AuditRow>>(`/audit${query({ actor, target, page })}`),

  landings: () => call<{ landings: LandingSummary[] }>('/landings').then((value) => value.landings),
  landing: (key: string) => call<{ landing: LandingDetail }>(`/landings/${key}`).then((value) => value.landing),
  createLanding: (key: string, name: string) => call<{ landing: LandingDetail }>('/landings', 'POST', { key, name }).then((value) => value.landing),
  saveLanding: (key: string, name: string, draft: LandingDoc, baseRev: number) => call<{ landing: LandingDetail }>(`/landings/${key}`, 'PUT', { name, draft, baseRev }).then((value) => value.landing),
  publishLanding: (key: string, baseRev: number) => call<{ landing: LandingDetail }>(`/landings/${key}/publish`, 'POST', { baseRev }).then((value) => value.landing),
  unpublishLanding: (key: string) => call<{ landing: LandingDetail }>(`/landings/${key}/unpublish`, 'POST').then((value) => value.landing),
  /** Raw bytes; the file name only lets the server double-check the type it sniffs. */
  uploadLandingAsset: (file: File) => send<{ asset: { id: string; mimeType: string; size: number } }>('/landings/assets', 'POST', file, {
    'Content-Type': 'application/octet-stream', 'X-CN-Filename': encodeURIComponent(file.name),
  }).then((value) => value.asset),
}
