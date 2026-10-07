import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { searchTools } from '@/features/tools/hub/utils/tool-search'
import { redactPromptText } from './prompt-package'
import { translate } from '@/i18n/runtime'

export function assistantMatches(catalog: ToolDefinition[], question: string): ToolDefinition[] {
  return question.trim() ? searchTools(catalog.filter(tool => tool.id !== 'assistant'), question).slice(0, 6) : []
}

export function assistantPrompt(question: string, tools: ToolDefinition[]): string {
  const safeQuestion = redactPromptText(question).slice(0, 4000)
  const list = tools.map((tool) => `- ${tool.name}: ${tool.description} (/${tool.slug})`).join('\n') || translate('byoai:prompt.assistant.noTools')
  // Prompt theo ngôn ngữ trang để AI trả lời đúng ngôn ngữ người đang xem.
  return [
    translate('byoai:prompt.assistant.intro'),
    translate('byoai:prompt.assistant.question', { question: safeQuestion }),
    `${translate('byoai:prompt.assistant.toolsHeading')}\n${list}`,
    translate('byoai:prompt.assistant.closing'),
  ].join('\n\n')
}
