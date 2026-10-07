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
] as const

const text = (value: unknown): McpToolResult => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }] })
const failure = (message: string): McpToolResult => ({ content: [{ type: 'text', text: message }], isError: true })
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

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

export function callMcpTool(name: string, args: Record<string, unknown>): McpToolResult {
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
  return failure(`Unknown tool: ${name}`)
}
