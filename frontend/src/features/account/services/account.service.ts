import { withBase } from '@/utils/url'
import { ACCOUNT_ERROR_CODES, type AccountErrorCode, type AccountState, type MyContribution, type MyContributionsPage, type ProfileInput, type SourceRef } from '../types/account.types'

export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode, readonly status: number) {
    super(code)
  }
}

const isKnownCode = (value: unknown): value is AccountErrorCode => (ACCOUNT_ERROR_CODES as readonly unknown[]).includes(value)

async function call<T>(path: string, init?: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }): Promise<T> {
  let response: Response
  try {
    response = await fetch(withBase('/api/v1' + path), init
      // The backend refuses cookie-authenticated writes without this header (CSRF barrier).
      ? { method: init.method, headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify(init.body ?? {}), credentials: 'same-origin' }
      : { cache: 'no-store', credentials: 'same-origin' })
  } catch {
    throw new AccountError('NETWORK', 0)
  }
  const value = await response.json().catch(() => null) as ({ ok?: boolean; code?: unknown } & T) | null
  if (response.ok && value?.ok) return value
  const code = isKnownCode(value?.code) ? value.code : response.status === 401 ? 'SIGNED_OUT' : 'UNKNOWN'
  throw new AccountError(code, response.status)
}

export const accountService = {
  me: () => call<AccountState>('/me'),
  // The mail template only exists in Vietnamese and English.
  requestCode: (email: string, locale: string) => call<{ ok: true }>('/auth/otp/request', { method: 'POST', body: { email, locale: locale === 'vi' ? 'vi' : 'en' } }),
  login: (email: string, password: string) => call<AccountState>('/auth/login', { method: 'POST', body: { email, password } }),
  setupPassword: (email: string, code: string, password: string) => call<AccountState>('/auth/password/setup', { method: 'POST', body: { email, code, password } }),
  changePassword: (currentPassword: string, newPassword: string) => call<{ ok: true; ended: number }>('/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
  endOtherSessions: () => call<{ ok: true; ended: number }>('/me/sessions/end-others', { method: 'POST' }),
  requestEmailChange: (email: string, password: string, locale: string) =>
    call<{ ok: true }>('/me/email', { method: 'POST', body: { email, password, locale: locale === 'vi' ? 'vi' : 'en' } }),
  confirmEmailChange: (code: string) => call<AccountState & { ended: number }>('/me/email/confirm', { method: 'POST', body: { code } }),
  logout: () => call<{ ok: true }>('/auth/logout', { method: 'POST' }),
  updateProfile: (input: ProfileInput) => call<AccountState>('/me', { method: 'PATCH', body: input }),
  myContributions: (page: number) => call<MyContributionsPage>(`/me/contributions?page=${page}`),
  addEvidence: (id: string, sourceRefs: SourceRef[]) =>
    call<Pick<MyContribution, 'status' | 'sourceRefs'>>(`/me/contributions/${encodeURIComponent(id)}/evidence`, { method: 'POST', body: { sourceRefs } }),
  deleteAccount: (password: string) => call<{ ok: true }>('/me', { method: 'DELETE', body: { password } }),
}
