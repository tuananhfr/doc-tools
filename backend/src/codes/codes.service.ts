import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { configuration } from '../config/configuration'
import { SettingsService } from '../settings/settings.service'
import { CODE_ID, PUBLIC_TOKEN, codeInput, revokeInput } from './codes-input'
import { CodesRepository } from './codes.repository'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const missing = () => new NotFoundException({ ok: false, code: 'CODE_NOT_FOUND', message: 'Mã không tồn tại hoặc khóa quản lý không đúng.' })

@Injectable()
export class CodesService {
  constructor(private readonly repository: CodesRepository, private readonly settings: SettingsService) {}
  async create(body: unknown, ip: string) {
    const now = Date.now(), input = codeInput(body, now)
    if (!input) throw new BadRequestException({ ok: false, code: 'CODE_INPUT_INVALID', message: 'Cần đường dẫn HTTPS công khai và hạn dùng hợp lệ trong tương lai.' })
    const id = randomUUID(), token = randomBytes(24).toString('base64url'), key = randomBytes(32).toString('base64url')
    const actor = createHmac('sha256', configuration().visitHashSecret).update(`code-create:${Math.floor(now / 3600000)}:${ip}`).digest('hex')
    if (!await this.repository.create(input, id, hash(token), hash(key), actor, await this.settings.get('codes.guestHourly'), now))
      throw new HttpException({ ok: false, code: 'CODE_RATE_LIMITED', message: 'Đã đạt giới hạn tạo QR trong giờ này. Hãy thử lại sau.' }, 429)
    return { ok: true, id, resolve_url: `${configuration().siteUrl}/api/v1/codes/${token}/resolve`, manage_key: key, expires_at: input.expiresAt === null ? null : new Date(input.expiresAt).toISOString() }
  }
  async resolve(token: string) {
    if (!PUBLIC_TOKEN.test(token)) throw missing()
    const row = await this.repository.resolve(hash(token))
    if (!row) throw missing()
    if (row.revoked_at !== null || row.expires_at !== null && Number(row.expires_at) <= Date.now())
      throw new HttpException({ ok: false, code: 'CODE_INACTIVE', message: 'QR đã hết hạn hoặc được thu hồi.' }, 410)
    return String(row.destination_url)
  }
  async revoke(id: string, body: unknown) {
    const key = revokeInput(body)
    if (!CODE_ID.test(id) || !key) throw missing()
    const stored = await this.repository.managementHash(id)
    const matches = timingSafeEqual(Buffer.from(stored ?? '0'.repeat(64), 'hex'), Buffer.from(hash(key), 'hex'))
    if (!stored || !matches) throw missing()
    await this.repository.revoke(id, Date.now())
    return { ok: true, revoked: true }
  }
}
