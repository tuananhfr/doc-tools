import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ContributionsRepository, type ContributionStatus } from '../contributions/contributions.repository'
import { assertPublishablePackage } from '../contributions/publish-check'
import { AdminAuditRepository } from './admin-audit.repository'
import { AdminContributionsRepository, type ContributionFilter } from './admin-contributions.repository'
import { ADMIN_PAGE_SIZE } from './admin-input'
import type { StaffActor } from './admin.guard'

export const TRANSITIONS = ['verify', 'approve', 'reject', 'publish', 'supersede', 'revoke'] as const
export type Transition = (typeof TRANSITIONS)[number]

/** The repository and the publish check speak English to the CLI; the admin screen needs codes and Vietnamese. */
const FAILURES: [RegExp, string, string][] = [
  [/^Contribution not found/, 'NOT_FOUND', 'Không tìm thấy đề xuất.'],
  [/^Cannot \w+ from /, 'INVALID_STATE', 'Trạng thái đề xuất đã đổi, không làm được bước này. Hãy tải lại.'],
  [/^Approver must differ/, 'SAME_PERSON', 'Người phê duyệt phải khác người xác minh.'],
  [/^Publisher must differ/, 'SAME_PERSON', 'Người công bố phải khác người xác minh và người phê duyệt.'],
  [/^Verification note is required/, 'NOTE_REQUIRED', 'Ghi chú xác minh cần ít nhất 10 ký tự.'],
  [/^Source references required/, 'SOURCE_REQUIRED', 'Đề xuất dữ liệu cần có nguồn trước khi xác minh.'],
  [/^High-risk contribution requires/, 'OFFICIAL_SOURCE_REQUIRED', 'Dữ liệu rủi ro cao cần ít nhất một nguồn chính thức.'],
  [/^(Publish requires|Signed rule package digest|Matching signed rule package)/, 'PACKAGE_REQUIRED', 'Cần digest của gói quy định đã ký và đã stage bằng CLI.'],
  [/^RULE_SIGNING_PUBLIC_KEY_PEM/, 'SIGNING_KEY_MISSING', 'Máy chủ chưa cấu hình khoá công khai để kiểm chữ ký gói.'],
  [/^Staged package signature/, 'PACKAGE_INVALID', 'Chữ ký gói không hợp lệ.'],
  [/^Rule package has already expired/, 'PACKAGE_EXPIRED', 'Gói quy định đã hết hiệu lực.'],
  [/^Base snapshot changed/, 'BASE_CHANGED', 'Dữ liệu gốc đã đổi từ lúc gửi; cần xem lại đề xuất trên bản đang hiệu lực.'],
]

function translate(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  const match = FAILURES.find(([pattern]) => pattern.test(message))
  if (!match) throw error
  const [, code, text] = match
  if (code === 'NOT_FOUND') throw new NotFoundException({ ok: false, code, message: text })
  throw new ConflictException({ ok: false, code, message: text })
}

@Injectable()
export class AdminContributionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly contributions: ContributionsRepository,
    private readonly repository: AdminContributionsRepository,
    private readonly audit: AdminAuditRepository,
  ) {}

  async list(filter: ContributionFilter, page: number) {
    return { ok: true, page, pageSize: ADMIN_PAGE_SIZE, ...await this.repository.list(filter, page, ADMIN_PAGE_SIZE), domains: await this.repository.domains() }
  }

  async detail(id: string) {
    const row = await this.contributions.getForReview(id)
    if (!row) throw new NotFoundException({ ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy đề xuất.' })
    return {
      ok: true,
      contribution: {
        id: row.id as string, toolId: row.tool_id as string, domain: row.domain as string, risk: row.risk as string, status: row.status as ContributionStatus,
        baseSnapshotId: row.base_snapshot_id as string | null, jurisdiction: row.jurisdiction as string | null,
        proposedChanges: row.proposed_changes, sourceRefs: row.source_refs,
        reviewedBy: row.reviewed_by as string | null, approvedBy: row.approved_by as string | null, publishedDigest: row.published_digest as string | null,
        submitterEmail: row.submitter_email as string | null, attribution: row.attribution_consent === null ? null : Boolean(row.attribution_consent),
        createdAt: (row.created_at as Date).toISOString(),
      },
      trail: await this.repository.trail(id),
    }
  }

  async transition(actor: StaffActor, id: string, action: Transition, note: string | null, digest: string | null) {
    try {
      let packageDigest: string | null = null
      if (action === 'publish') {
        const row = await this.contributions.getForReview(id)
        if (!row) throw new Error('Contribution not found')
        if (row.domain !== 'ideas') {
          await assertPublishablePackage(this.database, row.domain as string, digest ?? '')
          packageDigest = digest
        }
      }
      // Same separation of duties as the CLI: the staff email is the identity compared across steps.
      const status = await this.contributions.transition(id, action, actor.label, action === 'publish' ? null : note, packageDigest)
      await this.audit.record(actor, `CONTRIBUTION_${action.toUpperCase()}`, 'contribution', id, note ?? packageDigest)
      return { ok: true, status }
    } catch (error) { translate(error) }
  }
}
