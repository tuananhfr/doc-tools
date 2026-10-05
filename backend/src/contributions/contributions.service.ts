import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { configuration } from '../config/configuration'
import type { ContributionInput, SourceRef } from './contribution-input'
import { contributionRisk } from './contribution-input'
import { ContributionsRepository } from './contributions.repository'

function hash(value: string) { return createHash('sha256').update(value).digest('hex') }
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`
}

@Injectable()
export class ContributionsService {
  constructor(private readonly repository: ContributionsRepository) {}

  async submit(input: ContributionInput, ip: string) {
    const secret = configuration().visitHashSecret
    const receiptCode = randomBytes(24).toString('base64url')
    const status = input.sourceRefs.length || input.domain === 'ideas' ? 'NEEDS_REVIEW' : 'NEEDS_SOURCE'
    const result = await this.repository.submit(input, {
      id: randomUUID(), receiptHash: hash(receiptCode), duplicateHash: hash(stable(input)),
      ipHash: createHmac('sha256', secret).update(`contribution:${ip}`).digest('hex'),
      risk: contributionRisk(input.domain), status,
    }, Math.floor(Date.now() / 1000))
    if (result === 'DUPLICATE') throw new ConflictException({ ok: false, code: 'DUPLICATE_CONTRIBUTION', message: 'Đề xuất này đã có trong hàng chờ.' })
    if (result === 'RATE_LIMITED') throw new HttpException({ ok: false, message: 'Bạn đã gửi quá nhiều đề xuất. Hãy thử lại sau một giờ.' }, HttpStatus.TOO_MANY_REQUESTS)
    return { ok: true, receiptCode, status }
  }

  async status(receiptCode: string) { return { ok: true, contribution: await this.repository.status(hash(receiptCode)) } }
  async addSources(receiptCode: string, sources: SourceRef[]) {
    if (!await this.repository.addSources(hash(receiptCode), sources)) throw new NotFoundException({ ok: false, message: 'Không tìm thấy đề xuất đang chờ nguồn cho mã này.' })
    return { ok: true, status: 'NEEDS_REVIEW' }
  }
  async ideas() { return { ok: true, ideas: await this.repository.publishedIdeas() } }
}
