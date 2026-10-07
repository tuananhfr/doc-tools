import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { configuration } from '../config/configuration'
import { SettingsService } from '../settings/settings.service'
import type { ContributionInput, ProposedChange, SourceRef } from './contribution-input'
import { contributionRisk } from './contribution-input'
import { ContributionsRepository, EVIDENCE_OPEN, MAX_SOURCE_REFS } from './contributions.repository'

export const MINE_PAGE_SIZE = 20
// A contribution may carry 50 changes of 5000 characters; the list only needs a glimpse of each.
const PREVIEW_CHANGES = 3
const PREVIEW_CHARS = 280

function hash(value: string) { return createHash('sha256').update(value).digest('hex') }
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`
}
function clip(text: string) { return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text }
function preview(changes: ProposedChange[]) {
  return changes.slice(0, PREVIEW_CHANGES).map((change) => ({ field: change.field, before: clip(change.before), after: clip(change.after) }))
}

export interface Submitter { userId: string; attribution: boolean }

@Injectable()
export class ContributionsService {
  constructor(private readonly repository: ContributionsRepository, private readonly settings: SettingsService) {}

  /** `id` is passed in by draft submission, which claims the draft under that id before calling here. */
  async submit(input: ContributionInput, ip: string, submitter: Submitter | null, id: string = randomUUID()) {
    const secret = configuration().visitHashSecret
    const receiptCode = randomBytes(24).toString('base64url')
    const status = input.sourceRefs.length || input.domain === 'ideas' ? 'NEEDS_REVIEW' : 'NEEDS_SOURCE'
    const result = await this.repository.submit(input, {
      id, receiptHash: hash(receiptCode), duplicateHash: hash(stable(input)),
      floodKey: createHmac('sha256', secret).update(submitter ? `contribution-user:${submitter.userId}` : `contribution:${ip}`).digest('hex'),
      // Per account rather than per IP, so an office behind one address does not lock its staff out.
      floodLimit: await this.settings.get(submitter ? 'contributions.accountHourly' : 'contributions.guestHourly'),
      risk: contributionRisk(input.domain), status, submitter,
    }, Math.floor(Date.now() / 1000))
    if (result === 'DUPLICATE') throw new ConflictException({ ok: false, code: 'DUPLICATE_CONTRIBUTION', message: 'Đề xuất này đã có trong hàng chờ.' })
    if (result === 'RATE_LIMITED') throw new HttpException({ ok: false, code: 'RATE_LIMITED', message: 'Bạn đã gửi quá nhiều đề xuất. Hãy thử lại sau một giờ.' }, HttpStatus.TOO_MANY_REQUESTS)
    return { ok: true, receiptCode, status, tracked: Boolean(submitter) }
  }

  async status(receiptCode: string) { return { ok: true, contribution: await this.repository.status(hash(receiptCode)) } }
  async addSources(receiptCode: string, sources: SourceRef[]) {
    if (!await this.repository.addSources(hash(receiptCode), sources)) throw new NotFoundException({ ok: false, message: 'Không tìm thấy đề xuất đang chờ nguồn cho mã này.' })
    return { ok: true, status: 'NEEDS_REVIEW' }
  }
  async ideas() { return { ok: true, ideas: await this.repository.publishedIdeas() } }

  async mine(userId: string, page: number) {
    const { items, total } = await this.repository.mine(userId, page, MINE_PAGE_SIZE)
    return {
      ok: true, page, pageSize: MINE_PAGE_SIZE, total,
      items: items.map(({ proposedChanges, ...item }) => ({
        ...item, changes: preview(proposedChanges), changeCount: proposedChanges.length, canAddEvidence: EVIDENCE_OPEN.includes(item.status),
      })),
    }
  }

  async addEvidence(userId: string, id: string, sources: SourceRef[]) {
    const result = await this.repository.addEvidence(userId, id, sources)
    if (result === 'NOT_FOUND') throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy đề xuất này.' })
    if (result === 'CLOSED') throw new ConflictException({ ok: false, code: 'EVIDENCE_CLOSED', message: 'Đề xuất đã được xét, không bổ sung nguồn được nữa.' })
    if (result === 'TOO_MANY') throw new BadRequestException({ ok: false, code: 'TOO_MANY_SOURCES', message: `Mỗi đề xuất có tối đa ${MAX_SOURCE_REFS} nguồn.` })
    return { ok: true, ...result }
  }
}
