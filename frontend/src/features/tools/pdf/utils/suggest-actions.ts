import { translate } from '@/i18n/runtime'

export type SuggestionId = 'merge' | 'image-to-pdf' | 'split' | 'pdf-to-word' | 'pdf-to-image'

export interface Suggestion {
  id: SuggestionId
  label: string
  icon: string
}

export interface SuggestInput {
  pdfFiles: number
  imageFiles: number
  pageCount: number
}

const MAX_SUGGESTIONS = 3

/** Việc hợp lý nhất với những gì vừa thả vào — chỉ gợi ý việc làm được với đúng bộ tệp đó. */
export function suggestActions({ pdfFiles, imageFiles, pageCount }: SuggestInput): Suggestion[] {
  const files = pdfFiles + imageFiles
  const all: Suggestion[] = []

  if (pdfFiles > 0 && files > 1) all.push({ id: 'merge', label: translate('pdf:suggest.merge', { count: pageCount }), icon: 'files' })
  if (imageFiles > 0 && pdfFiles === 0) {
    all.push({
      id: 'image-to-pdf',
      label: imageFiles === 1 ? translate('pdf:suggest.imageToPdfOne') : translate('pdf:suggest.imageToPdfMany', { count: imageFiles }),
      icon: 'file-earmark-pdf',
    })
  }
  if (pdfFiles === 1 && imageFiles === 0 && pageCount > 1) all.push({ id: 'split', label: translate('pdf:suggest.split'), icon: 'scissors' })
  if (pdfFiles > 0) all.push({ id: 'pdf-to-word', label: translate('pdf:suggest.pdfToWord'), icon: 'file-earmark-word' })
  if (pdfFiles > 0) all.push({ id: 'pdf-to-image', label: translate('pdf:suggest.pdfToImage'), icon: 'file-earmark-image' })

  return all.slice(0, MAX_SUGGESTIONS)
}
