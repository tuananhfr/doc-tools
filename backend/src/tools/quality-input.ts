export const QUALITY_EVENTS = ['zero-result', 'reformulation', 'tool-opened', 'completion', 'download'] as const
export const QUALITY_TOOLS = ['none', 'compress-pdf', 'merge-pdf', 'split-pdf', 'scan-to-pdf', 'compress-image', 'ocr', 'image-to-text', 'qr-create'] as const
export type QualityEvent = { event: typeof QUALITY_EVENTS[number]; tool: typeof QUALITY_TOOLS[number] }

export function qualityInput(body: unknown): QualityEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const input = body as Record<string, unknown>
  if (Object.keys(input).length !== 2 || !QUALITY_EVENTS.some(value => value === input.event) || !QUALITY_TOOLS.some(value => value === input.tool)) return null
  if (['zero-result', 'reformulation'].includes(input.event as string) && input.tool !== 'none') return null
  if (['tool-opened', 'completion', 'download'].includes(input.event as string) && input.tool === 'none') return null
  return input as QualityEvent
}
