export interface PromptPackage {
  context: string
  current_snapshot: string | null
  source_checked_at: string | null
  jurisdiction: string | null
  known_sources: string[]
  verification_tasks: string[]
  privacy_redactions: string[]
  output_schema: string
}

export function redactPromptText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+/gi, '[redacted credential]')
    .replace(/\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '[redacted credential]')
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[^\s/]+\.internal)(?:[^\s]*)?/gi, '[redacted internal URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
    .replace(/(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}\b/g, '[redacted phone]')
}

export function buildPromptPackage(input: { toolId: string; snapshot: string | null; checkedAt: string | null; jurisdiction: string | null; sources: string[]; context?: string; includeContext: boolean }): PromptPackage {
  const configuredLimit = Number(process.env.NEXT_PUBLIC_BYOAI_PROMPT_MAX_CHARS ?? 12000)
  const limit = Number.isInteger(configuredLimit) && configuredLimit >= 1000 && configuredLimit <= 100000 ? configuredLimit : 12000
  const context = redactPromptText(input.context ?? '')
  return {
    context: input.includeContext ? context.length > limit ? `${context.slice(0, limit)}\n[Đã rút gọn vì vượt giới hạn câu hỏi.]` : context : `Kiểm tra cập nhật cho công cụ ${input.toolId}; không có dữ liệu cá nhân của người dùng.`,
    current_snapshot: input.snapshot,
    source_checked_at: input.checkedAt,
    jurisdiction: input.jurisdiction,
    known_sources: input.sources,
    verification_tasks: ['Ưu tiên văn bản, trang hoặc API chính thức.', 'So sánh với dữ liệu hiện tại; nêu ngày ban hành và ngày hiệu lực.', 'Đưa URL nguồn cho mỗi thay đổi; ghi rõ điều chưa chắc chắn.', 'Không suy đoán khi thiếu bằng chứng.'],
    privacy_redactions: input.includeContext ? ['Credentials, internal URLs and email addresses redacted automatically; user must review the preview.'] : ['User result and personal context excluded by default.'],
    output_schema: '{"changes":[{"field":"string","before":"string","after":"string"}],"sources":[{"url":"https://...","type":"OFFICIAL_WEB|OFFICIAL_DOCUMENT|OFFICIAL_API|OTHER"}],"uncertainties":["string"]}',
  }
}

export function promptText(input: PromptPackage): string {
  return ['Bạn là trợ lý đối chiếu nguồn. Chỉ đề xuất thay đổi có thể kiểm chứng; kết quả của bạn chưa được coi là dữ liệu đã xác minh.', JSON.stringify(input, null, 2), 'Trả về đúng JSON theo output_schema. Không thêm Markdown hoặc lời dẫn.'].join('\n\n')
}
