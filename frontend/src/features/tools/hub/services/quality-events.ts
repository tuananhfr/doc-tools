import { withBase } from '@/utils/url'

export type QualityEventName = 'zero-result' | 'reformulation' | 'tool-opened' | 'completion' | 'download'
const TOOLS = new Set(['none', 'compress-pdf', 'merge-pdf', 'split-pdf', 'scan-to-pdf', 'compress-image', 'ocr', 'image-to-text', 'qr-create'])
const EVENTS = new Set(['zero-result', 'reformulation', 'tool-opened', 'completion', 'download'])
let consent = false
const listeners = new Set<() => void>()
const enabled = () => process.env.NEXT_PUBLIC_QUALITY_EVENTS === '1'

export const qualityConsent = () => consent
export const qualityEnabled = enabled
export const subscribeQualityConsent = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setQualityConsent(value: boolean): void {
  consent = enabled() && value
  for (const listener of listeners) listener()
}

export function recordQualityEvent(event: QualityEventName, tool = 'none'): void {
  if (!enabled() || !consent || !EVENTS.has(event) || !TOOLS.has(tool)) return
  if (['zero-result', 'reformulation'].includes(event) !== (tool === 'none')) return
  const body = JSON.stringify({ event, tool })
  void fetch(withBase('/api/v1/tools/quality'), { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body, referrerPolicy: 'no-referrer' }).catch(() => undefined)
}
