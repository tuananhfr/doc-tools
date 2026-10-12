export interface DocumentBlock {
  text: string
  kind: 'title' | 'subtitle' | 'heading' | 'paragraph' | 'note'
  align?: 'left' | 'center'
}

export interface PrintDocument {
  title: string
  name: string
  font: string
  fontSize: number
  accent: string
  layout: 'standard' | 'compact' | 'centered' | 'sidebar'
  blocks: DocumentBlock[]
  sidebar?: DocumentBlock[]
  photo?: Blob
}

export const DOCUMENT_EXPORT_LIMITS = { pages: 50, characters: 200_000 } as const

export function documentFileStem(value: string): string {
  return value.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().slice(0, 90) || 'document'
}

export function documentCharacterCount(document: PrintDocument): number {
  return [...document.blocks, ...(document.sidebar ?? [])].reduce((sum, block) => sum + block.text.length, 0)
}
