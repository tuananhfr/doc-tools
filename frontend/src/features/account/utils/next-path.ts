const FALLBACK = '/tai-khoan'

/** Where to go after signing in; only same-site paths, so `?next=` cannot bounce people to another host. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f]/.test(raw)) return FALLBACK
  if (raw === '/dang-nhap' || raw.startsWith('/dang-nhap?') || raw.startsWith('/dang-nhap/')) return FALLBACK
  return raw
}

export const loginPath = (next: string) => `/dang-nhap?next=${encodeURIComponent(next)}`
