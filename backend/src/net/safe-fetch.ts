import { lookup } from 'node:dns/promises'
import type { IncomingMessage } from 'node:http'
import { request } from 'node:https'
import { isIP } from 'node:net'
import type { Readable } from 'node:stream'
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib'
import { isBlockedAddress } from './ip-policy'

export type SafeFetchErrorCode = 'INVALID_URL' | 'BLOCKED' | 'UNRESOLVED' | 'REDIRECT_LIMIT' | 'TIMEOUT' | 'TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'HTTP_STATUS' | 'NETWORK'

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode
  readonly status: number | null
  constructor(code: SafeFetchErrorCode, status: number | null = null) {
    super(code)
    this.code = code
    this.status = status
  }
}

export type Resolver = (host: string) => Promise<string[]>

/** How the fetcher reaches the network. Production passes only `resolve`; the other two exist for tests. */
export interface SafeFetchNetwork {
  resolve: Resolver
  /** Test seam: maps an address that already passed the policy to a local server. */
  dial?: (address: string, port: number) => { address: string; port: number }
  /** Test seam: CA for the self-signed test certificate. Certificate checks stay on. */
  ca?: string
}

export interface SafeFetchOptions {
  maxBytes: number
  timeoutMs: number
  maxRedirects: number
  /** Accepted media types without parameters, e.g. `text/html`; `''` accepts a missing Content-Type. */
  accept: readonly string[]
  acceptHeader: string
  /** Runs before every hop (first URL and each redirect target), e.g. a robots.txt check per origin. */
  beforeRequest?: (url: URL) => Promise<void>
}

export interface SafeFetchResult { url: string; status: number; contentType: string; charset: string | null; body: Buffer }

export const USER_AGENT = 'ChuyenNhoReader/1.0 (+https://chuyennho.tekshot.ai/xu-ly-du-lieu)'
export const systemResolver: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((entry) => entry.address)

const REDIRECTS = new Set([301, 302, 303, 307, 308])
// Intranet-only suffixes; single-label names are rejected separately.
const PRIVATE_SUFFIX = /(?:^|\.)(?:localhost|local|localdomain|internal|intranet|lan|home|corp|home\.arpa)$/i

const hostOf = (url: URL) => url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()

/**
 * Accepts only https on the default port without credentials. WHATWG URL parsing has already turned decimal,
 * octal and hex IPv4 forms (`https://2130706433`, `https://0177.0.0.1`) into dotted quads before this check.
 */
export function parsePublicUrl(raw: string): URL {
  if (raw.length > 2048 || /[\u0000- \u007f]/u.test(raw)) throw new SafeFetchError('INVALID_URL')
  let url: URL
  try { url = new URL(raw) } catch { throw new SafeFetchError('INVALID_URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port !== '') throw new SafeFetchError('INVALID_URL')
  url.hash = ''
  const host = hostOf(url)
  if (isIP(host)) { if (isBlockedAddress(host)) throw new SafeFetchError('BLOCKED') }
  else if (!host.includes('.') || PRIVATE_SUFFIX.test(host)) throw new SafeFetchError('BLOCKED')
  return url
}

/** Resolves once and returns the address the socket will use; the HTTP client never resolves again (no rebinding). */
async function pinAddress(host: string, network: SafeFetchNetwork): Promise<string> {
  if (isIP(host)) return host
  let addresses: string[]
  try { addresses = await network.resolve(host) } catch { throw new SafeFetchError('UNRESOLVED') }
  if (!addresses.length) throw new SafeFetchError('UNRESOLVED')
  // Every record must be public, not just the first: a mixed answer is a rebinding attempt.
  if (addresses.some(isBlockedAddress)) throw new SafeFetchError('BLOCKED')
  return addresses[0]
}

function requestOnce(url: URL, address: string, network: SafeFetchNetwork, options: SafeFetchOptions, deadline: number): Promise<IncomingMessage> {
  const host = hostOf(url)
  const target = network.dial ? network.dial(address, 443) : { address, port: 443 }
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) { reject(new SafeFetchError('TIMEOUT')); return }
    // Connecting to the pinned IP with SNI + Host set to the name keeps certificate checks on the name.
    const req = request({
      host: target.address, port: target.port, path: `${url.pathname}${url.search}`, method: 'GET', agent: false,
      servername: isIP(host) ? undefined : host, ca: network.ca,
      headers: { Host: url.host, 'User-Agent': USER_AGENT, Accept: options.acceptHeader, 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'vi, en;q=0.8' },
    }, (response) => { clearTimeout(timer); resolve(response) })
    const timer = setTimeout(() => req.destroy(new SafeFetchError('TIMEOUT')), remaining)
    req.on('error', (error) => { clearTimeout(timer); reject(error instanceof SafeFetchError ? error : new SafeFetchError('NETWORK')) })
    req.end()
  })
}

function parseContentType(header: string | undefined) {
  const [type = '', ...params] = (header ?? '').split(';')
  const charset = params.map((part) => /^\s*charset\s*=\s*"?([\w.:-]+)"?\s*$/i.exec(part)?.[1]).find(Boolean) ?? null
  return { type: type.trim().toLowerCase(), charset }
}

function readBody(response: IncomingMessage, maxBytes: number, deadline: number): Promise<Buffer> {
  const encoding = String(response.headers['content-encoding'] ?? '').trim().toLowerCase()
  let stream: Readable = response
  if (encoding === 'gzip' || encoding === 'x-gzip') stream = response.pipe(createGunzip())
  else if (encoding === 'deflate') stream = response.pipe(createInflate())
  else if (encoding === 'br') stream = response.pipe(createBrotliDecompress())
  else if (encoding && encoding !== 'identity') { response.destroy(); return Promise.reject(new SafeFetchError('UNSUPPORTED_TYPE')) }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const fail = (error: SafeFetchError) => { clearTimeout(timer); stream.destroy(); response.destroy(); reject(error) }
    const timer = setTimeout(() => fail(new SafeFetchError('TIMEOUT')), Math.max(0, deadline - Date.now()))
    // Counted after decompression, so a small gzip bomb stops at the same limit as a large plain body.
    stream.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) fail(new SafeFetchError('TOO_LARGE'))
      else chunks.push(chunk)
    })
    stream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)) })
    stream.on('error', () => fail(new SafeFetchError('NETWORK')))
    if (stream !== response) response.on('error', () => fail(new SafeFetchError('NETWORK')))
  })
}

/**
 * GET for a URL a user typed: https only, every hop re-validated, DNS resolved once and pinned, no cookies,
 * byte and time limits. Throws SafeFetchError; never returns a non-2xx response.
 */
export async function safeFetch(raw: string, options: SafeFetchOptions, network: SafeFetchNetwork = { resolve: systemResolver }): Promise<SafeFetchResult> {
  const deadline = Date.now() + options.timeoutMs
  let url = parsePublicUrl(raw)
  for (let hop = 0; ; hop++) {
    const address = await pinAddress(hostOf(url), network)
    // After the address check: a blocked or unknown host must fail as such, not as a robots.txt refusal.
    await options.beforeRequest?.(url)
    const response = await requestOnce(url, address, network, options, deadline)
    const status = response.statusCode ?? 0
    if (REDIRECTS.has(status)) {
      const location = response.headers.location
      response.destroy()
      if (!location) throw new SafeFetchError('HTTP_STATUS', status)
      if (hop >= options.maxRedirects) throw new SafeFetchError('REDIRECT_LIMIT')
      let next: URL
      try { next = new URL(location, url) } catch { throw new SafeFetchError('INVALID_URL') }
      url = parsePublicUrl(next.href)
      continue
    }
    if (status < 200 || status > 299) { response.destroy(); throw new SafeFetchError('HTTP_STATUS', status) }
    const { type, charset } = parseContentType(response.headers['content-type'])
    if (!options.accept.includes(type)) { response.destroy(); throw new SafeFetchError('UNSUPPORTED_TYPE') }
    const declared = Number(response.headers['content-length'])
    if (!response.headers['content-encoding'] && Number.isFinite(declared) && declared > options.maxBytes) { response.destroy(); throw new SafeFetchError('TOO_LARGE') }
    const body = await readBody(response, options.maxBytes, deadline)
    return { url: url.href, status, contentType: type, charset, body }
  }
}
