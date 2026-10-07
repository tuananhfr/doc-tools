import { Injectable } from '@nestjs/common'
import { AiRepository } from '../ai/ai.repository'
import { ContributionDraftsService } from '../contributions/contribution-drafts.service'
import { ContributionsService } from '../contributions/contributions.service'
import { parseDraftInput } from '../contributions/draft-input'
import { RulesService } from '../rules/rules.service'
import { callCatalogTool, failure, str, text, type McpToolResult } from './mcp-tools'
import { SOURCE_CHECK_KINDS, describePackage, fieldHint, type SourceCheckKind } from './rule-summary'
import { readyTool } from './tool-catalog'

const isKind = (value: string): value is SourceCheckKind => (SOURCE_CHECK_KINDS as readonly string[]).includes(value)

/** Tools that act for the person behind the MCP token: their rules view, their drafts, their contributions. */
@Injectable()
export class McpToolsService {
  constructor(
    private readonly rules: RulesService,
    private readonly drafts: ContributionDraftsService,
    private readonly contributions: ContributionsService,
    private readonly ai: AiRepository,
  ) {}

  async call(name: string, args: Record<string, unknown>, userId: string): Promise<McpToolResult> {
    const catalog = callCatalogTool(name, args)
    if (catalog) return catalog
    if (name === 'cn_get_rules') return this.getRules(args)
    if (name === 'cn_create_contribution_draft') return this.createDraft(args, userId)
    if (name === 'cn_my_contributions') return this.myContributions(args, userId)
    return failure(`Unknown tool: ${name}`)
  }

  private async getRules(args: Record<string, unknown>) {
    const kind = str(args.kind, 32)
    if (!isKind(kind)) return failure(`kind phải là một trong: ${SOURCE_CHECK_KINDS.join(', ')}.`)
    let active: Awaited<ReturnType<RulesService['active']>>
    // A missing signing key or a package that fails verification must not be passed off as current rules.
    try { active = await this.rules.active(kind) } catch { return failure('Kho quy định đang không đọc được; hãy báo người dùng thử lại sau, đừng đoán số liệu.') }
    const query = str(args.query, 100)
    return text({
      kind,
      current: describePackage(kind, active.package, query),
      upcoming: describePackage(kind, active.upcoming, query),
      ...(active.package ? {} : { note: 'Chưa có gói đã xác minh: người dùng đang tự nhập số liệu. Nháp vẫn tạo được, bỏ trống baseSnapshotId.' }),
      fieldHint: fieldHint(kind),
    })
  }

  private async createDraft(args: Record<string, unknown>, userId: string) {
    const toolId = str(args.toolId, 48)
    if (!readyTool(toolId)) return failure('toolId không phải công cụ đang chạy của Chuyện Nhỏ. Dùng slug như tien-dien, luong, doi-dia-chi.')
    const parsed = parseDraftInput({ ...args, toolId })
    if (typeof parsed === 'string') return failure(parsed)
    const created = await this.drafts.create(userId, parsed, 'agent')
    if (created === 'TOO_MANY') return failure('Người dùng đang có quá nhiều nháp chưa xem. Nhờ họ gửi hoặc xoá bớt nháp cũ trước.')
    await this.ai.linkSourceCheck(userId, toolId, created.id)
    return text({
      draftId: created.id,
      note: 'Đã lưu nháp. Người dùng sẽ thấy bảng thay đổi dưới khung chat của công cụ, tự chọn dòng và bấm gửi. Đừng nói là đã gửi, đã duyệt hay đã xác minh.',
    })
  }

  private async myContributions(args: Record<string, unknown>, userId: string) {
    const status = str(args.status, 20)
    const [mine, drafts] = await Promise.all([this.contributions.mine(userId, 1), this.drafts.list(userId, null)])
    return text({
      contributions: mine.items.filter((item) => !status || item.status === status)
        .map(({ toolId, domain, status: state, createdAt, changes, changeCount }) => ({ toolId, domain, status: state, createdAt, changeCount, changes })),
      openDrafts: drafts.items.map(({ toolId, createdAt, changes }) => ({ toolId, createdAt: new Date(createdAt * 1000).toISOString(), changeCount: changes.length })),
    })
  }
}
