export interface ProposedChange { field: string; before: string; after: string }
export interface SourceRef { url: string; type: 'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER' }
export interface ContributionInput { toolId: string; domain: string; baseSnapshotId: string | null; proposedChanges: ProposedChange[]; sourceRefs: SourceRef[]; jurisdiction: string | null }

const highRiskDomains = new Set(['addresses', 'electricity', 'payroll', 'legal', 'planning', 'standards', 'tax'])
const mediumRiskDomains = new Set(['prices', 'construction', 'templates', 'technical'])
export function contributionRisk(domain: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  return highRiskDomains.has(domain) ? 'HIGH' : mediumRiskDomains.has(domain) ? 'MEDIUM' : 'LOW'
}

function safeSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.endsWith('.local') && !host.endsWith('.internal') && host !== 'localhost' && !/[?&](?:token|key|sig|auth|session|access)[^=]*=/i.test(url.search) && !sensitivePattern.test(value)
  } catch { return false }
}

export function parseSourceRefs(value: unknown): SourceRef[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null
  for (const source of value) if (!source || typeof source !== 'object' || !safeSourceUrl(source.url) || !['OFFICIAL_WEB', 'OFFICIAL_DOCUMENT', 'OFFICIAL_API', 'OTHER'].includes(source.type)) return null
  return value.map((source) => ({ url: source.url as string, type: source.type as SourceRef['type'] }))
}

const sensitivePattern = /\bBearer\s+[A-Za-z0-9._~+/-]+|\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+|https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[^\s/]+\.internal)|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}\b/i

export function parseContributionInput(value: unknown): ContributionInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (typeof item.toolId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(item.toolId) || typeof item.domain !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(item.domain)) return null
  if (item.baseSnapshotId !== undefined && item.baseSnapshotId !== null && (typeof item.baseSnapshotId !== 'string' || item.baseSnapshotId.length > 128 || sensitivePattern.test(item.baseSnapshotId))) return null
  if (item.jurisdiction !== undefined && item.jurisdiction !== null && (typeof item.jurisdiction !== 'string' || item.jurisdiction.length > 128 || sensitivePattern.test(item.jurisdiction))) return null
  if (!Array.isArray(item.proposedChanges) || item.proposedChanges.length < 1 || item.proposedChanges.length > 50 || !Array.isArray(item.sourceRefs) || item.sourceRefs.length > 10) return null
  for (const change of item.proposedChanges) {
    if (!change || typeof change !== 'object' || typeof change.field !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(change.field) || typeof change.before !== 'string' || change.before.length > 5000 || typeof change.after !== 'string' || change.after.length > 5000 || change.before === change.after || sensitivePattern.test(`${change.before}\n${change.after}`)) return null
  }
  const sourceRefs = item.sourceRefs.length ? parseSourceRefs(item.sourceRefs) : []
  if (!sourceRefs) return null
  const proposedChanges = item.proposedChanges.map((change) => ({ field: change.field as string, before: change.before as string, after: change.after as string }))
  return { toolId: item.toolId, domain: item.domain, baseSnapshotId: item.baseSnapshotId ?? null, proposedChanges, sourceRefs, jurisdiction: item.jurisdiction ?? null } as ContributionInput
}
