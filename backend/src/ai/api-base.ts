import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

/** GoClaw calls this address from its own network, so a private target would let a user probe it. */
const PRIVATE = new BlockList()
for (const [network, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) {
  PRIVATE.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) {
  PRIVATE.addSubnet(network, prefix, 'ipv6')
}

export function isPrivateAddress(address: string) {
  const family = isIP(address)
  if (!family) return true
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) would otherwise slip past the IPv4 ranges.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped) return PRIVATE.check(mapped[1], 'ipv4')
  return PRIVATE.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

export type ApiBaseCheck = { ok: true; url: string } | { ok: false; reason: 'INVALID' | 'NOT_HTTPS' | 'PRIVATE' | 'UNRESOLVED' }

type Resolver = (host: string) => Promise<string[]>
const resolveAll: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address)

/**
 * Normalises a user-supplied provider address and rejects anything GoClaw should not call.
 * `allowPrivate` exists for local development against Ollama and is read from AI_DEV_ALLOW_PRIVATE_API_BASE.
 */
export async function checkApiBase(raw: string, allowPrivate: boolean, resolve: Resolver = resolveAll): Promise<ApiBaseCheck> {
  let url: URL
  try { url = new URL(raw.trim()) } catch { return { ok: false, reason: 'INVALID' } }
  if (url.username || url.password || url.search || url.hash || raw.length > 300) return { ok: false, reason: 'INVALID' }
  if (url.protocol !== 'https:' && !(allowPrivate && url.protocol === 'http:')) return { ok: false, reason: 'NOT_HTTPS' }
  const normalised = url.toString().replace(/\/+$/, '')
  if (allowPrivate) return { ok: true, url: normalised }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return { ok: false, reason: 'PRIVATE' }
  if (isIP(host)) return isPrivateAddress(host) ? { ok: false, reason: 'PRIVATE' } : { ok: true, url: normalised }
  let addresses: string[]
  try { addresses = await resolve(host) } catch { return { ok: false, reason: 'UNRESOLVED' } }
  if (!addresses.length) return { ok: false, reason: 'UNRESOLVED' }
  // Every record must be public: DNS can hand out a private address on a later lookup.
  return addresses.some(isPrivateAddress) ? { ok: false, reason: 'PRIVATE' } : { ok: true, url: normalised }
}
