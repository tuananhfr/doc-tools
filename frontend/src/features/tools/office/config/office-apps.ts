export const OFFICE_APPS = {
  'office-word': {
    id: 'wordcraft', name: 'WordCraft', vendor: 'ArtCraft', version: '0.6.1',
    license: 'MIT OR Apache-2.0', extension: '.docx', downloadMegabytes: 14.8,
    url: 'https://github.com/storytold/wordcraft/releases/download/v0.6.1/wordcraft-web-0.6.1.zip',
    sha256: '85e458cb5adaa75afa871a9858c735ef7fd1e05741c6bf5d444dc09a1eb29e0a',
  },
  'office-sheet': {
    id: 'gridcraft', name: 'GridCraft', vendor: 'ArtCraft', version: '0.6.1',
    license: 'MIT OR Apache-2.0', extension: '.xlsx', downloadMegabytes: 7.0,
    url: 'https://github.com/storytold/gridcraft/releases/download/v0.6.1/gridcraft-web-0.6.1.zip',
    sha256: '86048ba175689ff852c141d6115e5491f0856f891300c3e1f91274b9c2709a42',
  },
  'office-slide': {
    id: 'deckcraft', name: 'DeckCraft', vendor: 'ArtCraft', version: '0.6.1',
    license: 'MIT OR Apache-2.0', extension: '.pptx', downloadMegabytes: 8.9,
    url: 'https://github.com/storytold/deckcraft/releases/download/v0.6.1/deckcraft-web-0.6.1.zip',
    sha256: 'dd76659f643fa98ff79c86bf439bcaeeaaf6bd3a4037a1dc6628c97366862ba1',
  },
} as const

export type OfficeAppId = keyof typeof OFFICE_APPS

export function officeVendorPath(app: OfficeAppId): string {
  const { id, version } = OFFICE_APPS[app]
  return `/vendor/office/${id}-${version}/`
}
