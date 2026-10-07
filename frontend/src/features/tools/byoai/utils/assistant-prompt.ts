import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { searchTools } from '@/features/tools/hub/utils/tool-search'
import { redactPromptText } from './prompt-package'

export function assistantMatches(catalog: ToolDefinition[], question: string): ToolDefinition[] {
  return question.trim() ? searchTools(catalog.filter(tool => tool.id !== 'assistant'), question).slice(0, 6) : []
}

export function assistantPrompt(question: string, tools: ToolDefinition[]): string {
  const safeQuestion = redactPromptText(question).slice(0, 4000)
  return `Bạn là trợ lý chọn công cụ Chuyện Nhỏ. Hãy trả lời ngắn gọn bằng tiếng Việt. Chỉ gợi ý các công cụ trong danh sách dưới đây; không hứa tính năng mà mô tả chưa có. Nếu câu hỏi liên quan pháp lý, tài chính hoặc sức khỏe, hãy yêu cầu người dùng đối chiếu nguồn chính thức hiện hành. Không yêu cầu tải tệp riêng tư lên dịch vụ AI.\n\nCâu hỏi: ${safeQuestion}\n\nCông cụ có thể liên quan:\n${tools.map((tool) => `- ${tool.name}: ${tool.description} (/${tool.slug})`).join('\n') || '- Chưa tìm thấy công cụ khớp rõ ràng.'}\n\nNêu tối đa ba bước thực hiện và đường dẫn công cụ khi phù hợp.`
}
