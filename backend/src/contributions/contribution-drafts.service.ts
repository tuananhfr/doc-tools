import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { ContributionDraftsRepository } from './contribution-drafts.repository'
import { ContributionsService } from './contributions.service'
import type { DraftInput } from './draft-input'

/** Enough to review a few checks without the agent burying the person in drafts. */
export const MAX_OPEN_DRAFTS = 20

@Injectable()
export class ContributionDraftsService {
  constructor(private readonly repository: ContributionDraftsRepository, private readonly contributions: ContributionsService) {}

  async create(userId: string, draft: DraftInput, createdBy: 'agent' | 'user'): Promise<{ id: string } | 'TOO_MANY'> {
    if (await this.repository.countOpen(userId) >= MAX_OPEN_DRAFTS) return 'TOO_MANY'
    const id = randomUUID()
    await this.repository.create(id, userId, draft, createdBy, Math.floor(Date.now() / 1000))
    return { id }
  }

  async list(userId: string, toolId: string | null) {
    return { ok: true, items: await this.repository.listOpen(userId, toolId, MAX_OPEN_DRAFTS) }
  }

  async remove(userId: string, id: string) {
    if (!await this.repository.removeOpen(userId, id)) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy nháp này.' })
    return { ok: true }
  }

  /**
   * The only way a draft leaves the drafts table: as an ordinary signed-in contribution, so it gets the
   * same NEEDS_REVIEW queue, rate limit and duplicate check as one typed by hand. Rows not picked are dropped.
   */
  async submit(userId: string, id: string, selected: number[], attribution: boolean) {
    const draft = await this.repository.findOpen(userId, id)
    if (!draft) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy nháp này, hoặc nháp đã được gửi.' })
    if (!selected.length || new Set(selected).size !== selected.length || selected.some((index) => index >= draft.changes.length)) {
      throw new BadRequestException({ ok: false, code: 'SELECTION_INVALID', message: 'Hãy chọn ít nhất một thay đổi.' })
    }
    const contributionId = randomUUID()
    if (!await this.repository.claim(userId, id, contributionId)) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Nháp đã được gửi.' })
    const proposedChanges = [...selected].sort((a, b) => a - b).map((index) => draft.changes[index])
    try {
      const result = await this.contributions.submit({
        toolId: draft.toolId, domain: draft.domain, baseSnapshotId: draft.baseSnapshotId, jurisdiction: draft.jurisdiction,
        proposedChanges, sourceRefs: draft.sources,
      }, '', { userId, attribution }, contributionId)
      return { ...result, contributionId }
    } catch (error) {
      await this.repository.release(id, contributionId)
      throw error
    }
  }
}
