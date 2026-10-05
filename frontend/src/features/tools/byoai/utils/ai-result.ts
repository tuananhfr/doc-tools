export interface ProposedChange { field: string; before: string; after: string }
export interface ProposedSource { url: string; type: 'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER' }
export interface AiProposal { changes: ProposedChange[]; sources: ProposedSource[]; uncertainties: string[] }

function safeHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && Boolean(host) && host !== 'localhost' && !host.endsWith('.local') && !host.endsWith('.internal') && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !/[?&](?:token|key|sig|auth|session|access)[^=]*=/i.test(url.search) && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)
  }
  catch { return false }
}

export function parseAiProposal(text: string): AiProposal | null {
  if (text.length > 100000) return null
  try {
    const value = JSON.parse(text) as Record<string, unknown>
    if (!value || typeof value !== 'object' || !Array.isArray(value.changes) || value.changes.length < 1 || value.changes.length > 50 || !Array.isArray(value.sources) || value.sources.length > 10 || !Array.isArray(value.uncertainties) || value.uncertainties.length > 20) return null
    const changes: ProposedChange[] = []
    for (const item of value.changes) {
      if (!item || typeof item !== 'object' || typeof item.field !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(item.field) || typeof item.before !== 'string' || item.before.length > 5000 || typeof item.after !== 'string' || item.after.length > 5000 || item.before === item.after) return null
      changes.push({ field: item.field, before: item.before, after: item.after })
    }
    const sources: ProposedSource[] = []
    for (const item of value.sources) {
      if (!item || typeof item !== 'object' || !safeHttps(item.url) || !['OFFICIAL_WEB', 'OFFICIAL_DOCUMENT', 'OFFICIAL_API', 'OTHER'].includes(item.type)) return null
      sources.push({ url: item.url, type: item.type })
    }
    if (value.uncertainties.some((item: unknown) => typeof item !== 'string' || item.length > 1000)) return null
    return { changes, sources, uncertainties: value.uncertainties as string[] }
  } catch { return null }
}
