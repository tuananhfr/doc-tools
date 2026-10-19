export interface EcosystemServiceSearchItem {
  id: string
  category: string
}

export function splitEcosystemTitle(title: string): [string, string] | null {
  const parts = title.split(/\s+(?=(?:hệ sinh thái|ecosystem)$)/i)
  return parts.length === 2 ? [parts[0], parts[1]] : null
}

export function matchesEcosystemService(
  service: EcosystemServiceSearchItem,
  category: string,
  keyword: string,
  text: string,
): boolean {
  if (category !== 'all' && service.category !== category) return false
  return !keyword.trim() || text.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase())
}
