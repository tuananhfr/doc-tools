import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { normalizeTextSearch } from '@/utils/text-search'
import { redactPromptText } from './prompt-package'

export function assistantMatches(catalog: ToolDefinition[], question: string): ToolDefinition[] {
  if (!question.trim()) return []
  const stopwords = new Set(['toi', 'muon', 'can', 'lam', 'gi', 'nhu', 'the', 'nao', 'hay', 'giup', 'cho', 'voi', 'mot', 'cac', 'tep', 'file', 'hai', 'ba'])
  const tokens = normalizeTextSearch(question).split(' ').filter((token) => token.length >= 3 && !stopwords.has(token))
  if (!tokens.length) return []
  return catalog.filter((tool) => tool.status === 'ready' && tool.id !== 'assistant')
    .map((tool) => {
      const name = normalizeTextSearch(`${tool.name} ${tool.synonyms?.join(' ') || ''}`)
      const description = normalizeTextSearch(tool.description)
      const score = tokens.reduce((sum, token) => sum + (name.includes(token) ? 3 : description.includes(token) ? 1 : 0), 0)
      return { tool, score }
    })
    .filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map((item) => item.tool)
}

export function assistantPrompt(question: string, tools: ToolDefinition[]): string {
  const safeQuestion = redactPromptText(question).slice(0, 4000)
  return `Bạn là trợ lý chọn công cụ Chuyện Nhỏ. Hãy trả lời ngắn gọn bằng tiếng Việt. Chỉ gợi ý các công cụ trong danh sách dưới đây; không hứa tính năng mà mô tả chưa có. Nếu câu hỏi liên quan pháp lý, tài chính hoặc sức khỏe, hãy yêu cầu người dùng đối chiếu nguồn chính thức hiện hành. Không yêu cầu tải tệp riêng tư lên dịch vụ AI.\n\nCâu hỏi: ${safeQuestion}\n\nCông cụ có thể liên quan:\n${tools.map((tool) => `- ${tool.name}: ${tool.description} (/${tool.slug})`).join('\n') || '- Chưa tìm thấy công cụ khớp rõ ràng.'}\n\nNêu tối đa ba bước thực hiện và đường dẫn công cụ khi phù hợp.`
}
