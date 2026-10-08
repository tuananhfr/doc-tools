import { isIP } from 'node:net'
import { normalizeEmail } from '../accounts/profile-input'
import type { GoclawOverrides, MailOverrides, SecretName } from '../config/runtime-config'

export const INTEGRATION_GROUPS = ['mail', 'goclaw'] as const
export type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number]

export function isIntegrationGroup(value: unknown): value is IntegrationGroup {
  return typeof value === 'string' && (INTEGRATION_GROUPS as readonly string[]).includes(value)
}

/** Row in `app_settings`; not in SETTINGS, so the generic settings screen never lists it. */
export const GROUP_ROW: Record<IntegrationGroup, string> = { mail: 'integration.mail', goclaw: 'integration.goclaw' }

/** Secrets an admin may type in. The DKIM key is only ever generated on the server, never pasted. */
export const TYPED_SECRETS: Record<IntegrationGroup, Partial<Record<string, SecretName>>> = {
  mail: { smtpPassword: 'mail.smtpPassword' },
  goclaw: { gatewayToken: 'goclaw.gatewayToken' },
}
export const GROUP_SECRETS: Record<IntegrationGroup, readonly SecretName[]> = {
  mail: ['mail.smtpPassword', 'mail.dkimPrivateKey'],
  goclaw: ['goclaw.gatewayToken'],
}

export class IntegrationInputError extends Error {}

const fail = (message: string): never => { throw new IntegrationInputError(message) }
const CONTROL = /[\u0000-\u001f\u007f]/
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i

function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined || value === null) value = ''
  if (typeof value !== 'string') fail(`${label} không hợp lệ.`)
  const trimmed = (value as string).trim()
  if (CONTROL.test(trimmed)) fail(`${label} có ký tự không hợp lệ.`)
  if (trimmed.length > max) fail(`${label} tối đa ${max} ký tự.`)
  if (required && !trimmed) fail(`Cần nhập ${label.toLowerCase()}.`)
  return trimmed
}

function host(value: unknown, label: string, required = false) {
  const name = text(value, label, 253, required).toLowerCase()
  if (name && !HOSTNAME.test(name) && !isIP(name)) fail(`${label} phải là tên máy chủ hoặc địa chỉ IP.`)
  return name
}

/** No credentials in the URL: they would bypass the sealed-secret rules and show up in the admin screen. */
function url(value: unknown, label: string, protocols: readonly string[], required = false) {
  const raw = text(value, label, 500, required)
  if (!raw) return ''
  let parsed: URL
  try { parsed = new URL(raw) } catch { return fail(`${label} không phải địa chỉ hợp lệ.`) }
  if (!protocols.includes(parsed.protocol)) fail(`${label} phải bắt đầu bằng ${protocols.map((item) => `${item}//`).join(' hoặc ')}.`)
  if (parsed.username || parsed.password) fail(`${label} không được chứa tài khoản hay mật khẩu.`)
  if (parsed.hash) fail(`${label} không được có phần #.`)
  return raw.replace(/\/+$/, '')
}

export function parseMailInput(input: Record<string, unknown>): MailOverrides {
  const transport = input.transport
  if (transport !== 'log' && transport !== 'smtp' && transport !== 'direct') return fail('Cách gửi không hợp lệ.')
  const from = normalizeEmail(input.from) ?? fail('Email người gửi không hợp lệ.')
  const smtpPort = Number(input.smtpPort ?? 587)
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) fail('Cổng SMTP phải từ 1 đến 65535.')
  if (input.smtpSecure !== undefined && typeof input.smtpSecure !== 'boolean') fail('Tuỳ chọn TLS không hợp lệ.')
  const dkimSelector = text(input.dkimSelector, 'Selector DKIM', 63).toLowerCase()
  if (dkimSelector && !/^[a-z0-9-]{1,63}$/.test(dkimSelector)) fail('Selector DKIM chỉ gồm chữ thường, số và dấu gạch ngang.')
  return {
    transport, from,
    fromName: text(input.fromName, 'Tên người gửi', 100, true),
    heloName: host(input.heloName, 'Tên HELO'),
    smtpHost: host(input.smtpHost, 'Máy chủ SMTP', transport === 'smtp'),
    smtpPort, smtpSecure: input.smtpSecure === true,
    smtpUser: text(input.smtpUser, 'Tài khoản SMTP', 254),
    dkimDomain: host(input.dkimDomain, 'Tên miền DKIM'),
    dkimSelector,
  }
}

export function parseGoclawInput(input: Record<string, unknown>): GoclawOverrides {
  const mcpPublicUrl = url(input.mcpPublicUrl, 'Địa chỉ MCP', ['http:', 'https:'])
  if (mcpPublicUrl && !/\/mcp\/sse$/.test(mcpPublicUrl)) fail('Địa chỉ MCP phải kết thúc bằng /api/v1/mcp/sse.')
  const ips = Array.isArray(input.mcpAllowedIps) ? input.mcpAllowedIps : text(input.mcpAllowedIps, 'IP được gọi MCP', 1000).split(/[\s,]+/)
  const mcpAllowedIps = [...new Set(ips.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))]
  if (mcpAllowedIps.length > 32) fail('Tối đa 32 địa chỉ IP.')
  for (const ip of mcpAllowedIps) if (!isIP(ip)) fail(`${ip} không phải địa chỉ IP.`)
  return {
    url: url(input.url, 'Địa chỉ GoClaw', ['http:', 'https:'], true),
    publicWsUrl: url(input.publicWsUrl, 'WebSocket công khai', ['ws:', 'wss:']),
    publicFilesUrl: url(input.publicFilesUrl, 'Địa chỉ tệp công khai', ['http:', 'https:']),
    mcpPublicUrl, mcpAllowedIps,
  }
}

/** A typed secret: a new value, `null` to remove it, or absent to keep it. */
export function parseSecretValue(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string' || !value.trim()) return fail(`${label} không hợp lệ.`)
  if (value.length > 1024) fail(`${label} tối đa 1024 ký tự.`)
  if (/[\r\n]/.test(value)) fail(`${label} không được xuống dòng.`)
  return value
}

/** Stored rows are re-checked on load; a row that no longer parses is ignored and `.env` applies. */
export function storedGroup<G extends IntegrationGroup>(group: G, value: unknown): (G extends 'mail' ? MailOverrides : GoclawOverrides) | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  try {
    return (group === 'mail' ? parseMailInput(value as Record<string, unknown>) : parseGoclawInput(value as Record<string, unknown>)) as never
  } catch { return null }
}
