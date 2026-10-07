import type { RuleSnapshot } from '../types/ai.types'

/** Keeps the opening message well under the composer's 4000-character limit. */
export const MAX_RESULT_CHARS = 1500

/** Credentials, internal URLs, emails and phone numbers never leave in a source-check message. */
export function redactSensitive(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+/gi, '[…]')
    .replace(/\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '[…]')
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[^\s/]+\.internal)\S*/gi, '[…]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}\b/g, '[phone]')
}

export function clipResult(value: string): string {
  const text = redactSensitive(value.trim())
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}…` : text
}

type MessageKey = `sourceCheck.message.${'intro' | 'snapshot' | 'noSnapshot' | 'result' | 'ask'}`
type Translate = (key: MessageKey, values?: Record<string, string>) => string

export interface SourceCheckRequest { tool: string; toolId: string; domain: string; kinds: string[]; snapshot: RuleSnapshot | null; result: string | null }

/** The opening message the person sees and sends; the agent reads the rest through `cn_get_rules`. */
export function sourceCheckMessage(input: SourceCheckRequest, t: Translate): string {
  const lines = [
    t('sourceCheck.message.intro', { tool: input.tool, toolId: input.toolId, domain: input.domain, kinds: input.kinds.join(', ') }),
    input.snapshot
      ? t('sourceCheck.message.snapshot', { date: input.snapshot.effectiveFrom, title: input.snapshot.sourceTitle, url: input.snapshot.sourceUrl })
      : t('sourceCheck.message.noSnapshot'),
  ]
  const result = input.result ? clipResult(input.result) : ''
  if (result) lines.push(t('sourceCheck.message.result', { result }))
  lines.push(t('sourceCheck.message.ask'))
  return lines.join('\n\n')
}
