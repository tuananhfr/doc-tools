export const PRODUCT_REGISTRY = [
  { id: 'family-calendar', slug: 'lich-gia-dinh', owner: 'family-calendar', namespace: 'family', version: 1, entryId: 'family-calendar', status: 'ready' },
] as const

const productEntryIds: ReadonlySet<string> = new Set(PRODUCT_REGISTRY.map(product => product.entryId))

export function isProductEntry(entry: { id: string }): boolean {
  return productEntryIds.has(entry.id)
}

export const EXTERNAL_CAPABILITY_OWNERS: Readonly<Record<string, 'erpcons'>> = {
  'construction-price': 'erpcons', 'planning-lookup': 'erpcons', 'construction-law': 'erpcons', 'construction-standards': 'erpcons', 'dossier-check': 'erpcons', 'supplier-lookup': 'erpcons',
}

export function isExternalCapability(entry: { id: string }): boolean { return Boolean(EXTERNAL_CAPABILITY_OWNERS[entry.id]) }
