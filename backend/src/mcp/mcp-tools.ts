import { SOURCE_CHECK_KINDS } from './rule-summary'
import { findTools, readyTool, toolGuide } from './tool-catalog'

export interface McpToolResult { content: { type: 'text'; text: string }[]; isError?: boolean }

const LOCALE = { type: 'string', description: 'Mã ngôn ngữ của người dùng: vi, en, ja, ko, zh-hans, zh-hant, th, id, ms, fil, km, lo, my, fr, ar.' }

/** The first sentence of each description is what GoClaw puts in the system prompt; keep the rule first. */
export const MCP_TOOLS = [
  {
    name: 'cn_find_tools',
    description: 'Tìm công cụ Chuyện Nhỏ phù hợp với nhu cầu. Luôn gọi trước khi nói Chuyện Nhỏ có hay không có công cụ nào. Trả về slug, tên, mô tả.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Nhu cầu của người dùng, vài từ khoá.' }, locale: LOCALE, limit: { type: 'integer', minimum: 1, maximum: 15 } }, required: ['query'] },
  },
  {
    name: 'cn_tool_guide',
    description: 'Cách dùng, giới hạn và cách xử lý dữ liệu của một công cụ Chuyện Nhỏ (theo slug lấy từ cn_find_tools).',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' }, locale: LOCALE }, required: ['slug'] },
  },
  {
    name: 'cn_open_tool',
    description: 'Tạo nút mở một công cụ Chuyện Nhỏ. Chép nguyên văn khối cn-action trả về vào câu trả lời.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string' }, params: { type: 'object', description: 'Tham số điền sẵn trên URL công cụ (tuỳ chọn, tối đa 5).', additionalProperties: { type: 'string' } } },
      required: ['slug'],
    },
  },
  {
    name: 'cn_get_rules',
    description: 'Gói quy định Chuyện Nhỏ đang dùng và sắp hiệu lực (đã ký, có nguồn và ngày). Gọi trước khi so với văn bản mới; snapshotId dùng làm baseSnapshotId của nháp.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [...SOURCE_CHECK_KINDS], description: 'electricity = bậc giá điện, vat = thuế GTGT, payroll = tham số lương/bảo hiểm/thuế TNCN, addresses = đơn vị hành chính sau sáp nhập.' },
        query: { type: 'string', description: 'Chỉ cho addresses: tên xã/phường/huyện/tỉnh cần xem.' },
      },
      required: ['kind'],
    },
  },
  {
    name: 'cn_create_contribution_draft',
    description: 'Lưu NHÁP đề xuất sửa số liệu của một công cụ. Không gửi, không công bố: người dùng tự xem bảng khác biệt, chọn dòng và bấm gửi; người duyệt kiểm lại sau đó.',
    inputSchema: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Slug công cụ, ví dụ tien-dien, luong, doi-dia-chi.' },
        domain: { type: 'string', description: 'electricity (tien-dien), payroll (luong), addresses (doi-dia-chi).' },
        baseSnapshotId: { type: 'string', description: 'snapshotId lấy từ cn_get_rules.' },
        changes: {
          type: 'array', minItems: 1, maxItems: 50,
          items: { type: 'object', properties: { field: { type: 'string' }, before: { type: 'string' }, after: { type: 'string' } }, required: ['field', 'before', 'after'] },
        },
        sources: {
          type: 'array', maxItems: 10,
          items: { type: 'object', properties: { url: { type: 'string', description: 'https, trang chính thức' }, type: { type: 'string', enum: ['OFFICIAL_WEB', 'OFFICIAL_DOCUMENT', 'OFFICIAL_API', 'OTHER'] } }, required: ['url', 'type'] },
        },
        uncertainties: { type: 'array', maxItems: 20, items: { type: 'string' }, description: 'Điều chưa chắc, người duyệt cần kiểm.' },
        jurisdiction: { type: 'string', description: 'Phạm vi áp dụng, ví dụ VN hoặc tên tỉnh.' },
      },
      required: ['toolId', 'domain', 'changes', 'sources'],
    },
  },
  {
    name: 'cn_my_contributions',
    description: 'Đề xuất người dùng đã gửi (trạng thái duyệt) và số nháp đang chờ họ xem. Dùng trước khi tạo nháp mới để tránh trùng.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED'] } } },
  },
] as const

export const text = (value: unknown): McpToolResult => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] })
export const failure = (message: string): McpToolResult => ({ content: [{ type: 'text', text: message }], isError: true })
export const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Only short ASCII keys and plain values reach the URL the browser opens. */
function openParams(value: unknown): Record<string, string> | null {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 5) return null
  const params: Record<string, string> = {}
  for (const [key, raw] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,31}$/.test(key) || typeof raw !== 'string' || raw.length > 200) return null
    params[key] = raw
  }
  return params
}

/** Catalog tools need nothing about the caller; `null` means the name is not one of them. */
export function callCatalogTool(name: string, args: Record<string, unknown>): McpToolResult | null {
  const locale = str(args.locale, 10) || undefined
  if (name === 'cn_find_tools') {
    const limit = Math.min(15, Math.max(1, Number.isInteger(args.limit) ? Number(args.limit) : 8))
    const found = findTools(str(args.query, 500), locale, limit)
    return found.length ? text({ tools: found }) : text({ tools: [], note: 'Không có công cụ phù hợp. Đừng bịa công cụ; có thể gợi ý người dùng gửi đề xuất ở trang "Đề xuất tiện ích".' })
  }
  if (name === 'cn_tool_guide') {
    const guide = toolGuide(str(args.slug, 80), locale)
    return guide ? text(guide) : failure('Không có công cụ với slug này. Hãy dùng cn_find_tools để lấy slug đúng.')
  }
  if (name === 'cn_open_tool') {
    const tool = readyTool(str(args.slug, 80))
    if (!tool) return failure('Không có công cụ với slug này. Hãy dùng cn_find_tools để lấy slug đúng.')
    const params = openParams(args.params)
    if (!params) return failure('params không hợp lệ: tối đa 5 khoá chữ-số, giá trị là chuỗi ≤ 200 ký tự.')
    const action = { type: 'open-tool', slug: tool.slug, ...(Object.keys(params).length ? { params } : {}) }
    return text(`Chép nguyên văn khối dưới đây vào câu trả lời (giao diện sẽ hiện thành nút):\n\n\`\`\`cn-action\n${JSON.stringify(action)}\n\`\`\``)
  }
  return null
}
