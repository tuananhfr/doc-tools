import { translate, translateKey } from '@/i18n/runtime'

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

const VERIFICATION_TASKS = [0, 1, 2, 3]

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
    context: input.includeContext ? context.length > limit ? `${context.slice(0, limit)}\n${translate('byoai:prompt.package.truncated')}` : context : translate('byoai:prompt.package.noContext', { toolId: input.toolId }),
    current_snapshot: input.snapshot,
    source_checked_at: input.checkedAt,
    jurisdiction: input.jurisdiction,
    known_sources: input.sources,
    verification_tasks: VERIFICATION_TASKS.map((index) => translateKey(`byoai:prompt.package.tasks.${index}`)),
    privacy_redactions: input.includeContext ? [translate('byoai:prompt.package.redactedContext')] : [translate('byoai:prompt.package.excludedContext')],
    output_schema: '{"changes":[{"field":"string","before":"string","after":"string"}],"sources":[{"url":"https://...","type":"OFFICIAL_WEB|OFFICIAL_DOCUMENT|OFFICIAL_API|OTHER"}],"uncertainties":["string"]}',
  }
}

export function promptText(input: PromptPackage): string {
  return [translate('byoai:prompt.package.intro'), JSON.stringify(input, null, 2), translate('byoai:prompt.package.outro')].join('\n\n')
}
