import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { configuration } from '../config/configuration'
import { parsePublicUrl, safeFetch, SafeFetchError } from '../net/safe-fetch'
import { SettingsService } from '../settings/settings.service'
import { decodeHtml, extractArticle, looksPaywalled } from './article-extract'
import { readInput } from './read-input'
import { ReadLimitRepository } from './read-limit.repository'
import { ReadNetwork } from './read-network'
import { robotsAllows } from './robots'

export const PAGE_MAX_BYTES = 2 * 1024 * 1024
const ROBOTS_MAX_BYTES = 512 * 1024
const PAGE_TIMEOUT_MS = 10000
const ROBOTS_TIMEOUT_MS = 5000
// The per-IP budget does not stop a burst spread over many IPs; this caps sockets per process.
const MAX_IN_FLIGHT = 8

type ReadFailure = 'ROBOTS_DENIED' | 'PAYWALL' | 'NO_ARTICLE' | 'UNSUPPORTED' | 'TOO_LARGE'
type RobotsPolicy = { rules: string } | 'allow-all' | 'deny-all'

const MESSAGES: Record<ReadFailure, string> = {
  ROBOTS_DENIED: 'Trang này không cho phép đọc tự động (robots.txt). Hãy mở trang, chép nội dung rồi dán vào ô văn bản.',
  PAYWALL: 'Bài viết yêu cầu đăng ký hoặc trả phí. Chuyện Nhỏ không vượt tường phí; hãy dán phần văn bản bạn được phép đọc.',
  NO_ARTICLE: 'Không tìm thấy nội dung bài viết trên trang này. Hãy dán văn bản vào ô văn bản.',
  UNSUPPORTED: 'Không đọc được địa chỉ này. Chỉ hỗ trợ trang HTTPS công khai; bạn vẫn có thể dán văn bản.',
  TOO_LARGE: 'Trang quá lớn để đọc. Hãy chép phần cần nghe rồi dán vào ô văn bản.',
}
const failure = (code: ReadFailure) => new HttpException({ ok: false, code, message: MESSAGES[code] }, 422)

@Injectable()
export class ReadService {
  private inFlight = 0
  constructor(private readonly settings: SettingsService, private readonly limits: ReadLimitRepository, private readonly network: ReadNetwork) {}

  async config() { return { ok: true, linkEnabled: await this.settings.get('read.linkEnabled') } }

  async extract(body: unknown, ip: string) {
    if (!await this.settings.get('read.linkEnabled')) throw new NotFoundException({ ok: false, code: 'READ_DISABLED', message: 'Tính năng đọc từ đường dẫn đang tắt.' })
    const raw = readInput(body)
    if (!raw) throw new BadRequestException({ ok: false, code: 'READ_INPUT_INVALID', message: 'Cần một đường dẫn HTTPS hợp lệ.' })
    const now = Date.now()
    const actor = createHmac('sha256', configuration().visitHashSecret).update(`read-extract:${Math.floor(now / 3600000)}:${ip}`).digest('hex')
    if (!await this.limits.consume(actor, now, await this.settings.get('read.guestHourly')))
      throw new HttpException({ ok: false, code: 'READ_RATE_LIMITED', message: 'Đã đạt giới hạn đọc link trong giờ này. Hãy thử lại sau hoặc dán văn bản.' }, 429)
    if (this.inFlight >= MAX_IN_FLIGHT) throw new HttpException({ ok: false, code: 'READ_BUSY', message: 'Máy chủ đang bận. Hãy thử lại sau ít phút hoặc dán văn bản.' }, 503)
    this.inFlight++
    try { return await this.read(raw) }
    finally { this.inFlight-- }
  }

  private async read(raw: string) {
    try { parsePublicUrl(raw) } catch { throw failure('UNSUPPORTED') }
    // Per request only: nothing about the sites a user reads outlives the request.
    const robots = new Map<string, RobotsPolicy>()
    let page
    try {
      page = await safeFetch(raw, {
        maxBytes: PAGE_MAX_BYTES, timeoutMs: PAGE_TIMEOUT_MS, maxRedirects: 3,
        accept: ['text/html', 'application/xhtml+xml'], acceptHeader: 'text/html,application/xhtml+xml;q=0.9',
        // Every origin a redirect passes through gets its own robots.txt check, not only the one the user typed.
        beforeRequest: async (url) => {
          let policy = robots.get(url.origin)
          if (!policy) { policy = await this.robotsPolicy(url.origin); robots.set(url.origin, policy) }
          const allowed = policy === 'allow-all' || (policy !== 'deny-all' && robotsAllows(policy.rules, `${url.pathname}${url.search}`))
          if (!allowed) throw failure('ROBOTS_DENIED')
        },
      }, this.network)
    } catch (error) {
      if (error instanceof HttpException) throw error
      if (error instanceof SafeFetchError && error.code === 'TOO_LARGE') throw failure('TOO_LARGE')
      if (error instanceof SafeFetchError && (error.status === 401 || error.status === 402)) throw failure('PAYWALL')
      // Blocked, unresolved, refused and timed-out targets answer the same, so the API is no probe of internal hosts.
      throw failure('UNSUPPORTED')
    }
    const html = decodeHtml(page.body, page.charset)
    // Refused whole even when the paid text is in the HTML: reading it out would be a bypass.
    if (looksPaywalled(html)) throw failure('PAYWALL')
    const article = extractArticle(html)
    if (!article) throw failure('NO_ARTICLE')
    return {
      ok: true,
      document: { title: article.title, sourceUrl: page.url, checkedAt: new Date().toISOString(), segments: article.segments },
      warnings: article.truncated ? ['TOO_LARGE'] : [],
    }
  }

  /** RFC 9309: a 4xx means no rules; 5xx, 429, timeouts and blocked hosts mean do not read. */
  private async robotsPolicy(origin: string): Promise<RobotsPolicy> {
    try {
      const result = await safeFetch(`${origin}/robots.txt`, {
        maxBytes: ROBOTS_MAX_BYTES, timeoutMs: ROBOTS_TIMEOUT_MS, maxRedirects: 3,
        accept: ['text/plain', 'text/html', 'application/octet-stream', ''], acceptHeader: 'text/plain',
      }, this.network)
      return { rules: result.body.toString('utf8') }
    } catch (error) {
      const status = error instanceof SafeFetchError ? error.status : null
      return status !== null && status >= 400 && status < 500 && status !== 429 ? 'allow-all' : 'deny-all'
    }
  }
}
