import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'

const IDS = { merge: 'merge-pdf', split: 'split-pdf', compress: 'compress-pdf', convert: 'convert-file', password: 'pdf-password', organize: 'organize-pdf', numbers: 'page-numbers', stamp: 'stamp-pdf', redact: 'redact-pdf', sign: 'sign', compare: 'compare', reader: 'view-pdf' } as const
const TOOLS = ['view-pdf', 'edit-pdf', 'redact-pdf', 'sign', 'compare', 'organize-pdf', 'page-numbers', 'stamp-pdf', 'pdf-password', 'merge-pdf', 'split-pdf', 'compress-pdf', 'ocr']
export type PdfStudioKind = keyof typeof IDS

/** The PDF reference, adapted to quick operations with a single category menu. */
export function PdfQuickStudio({ kind, children }: { kind: PdfStudioKind; children: ReactNode }) {
  const { t: s } = useTranslation('pdf', { keyPrefix: 'quickStudio' })
  return <div className={`cn-pdfquickstudio cn-pdfquickstudio--${kind}`}><ImageStudio automatic={kind === 'merge' || kind === 'compress'} toolId={IDS[kind]} icon="file-earmark-pdf" title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
    category={{ title: s('category'), icon: 'file-earmark-pdf', path: '/tai-lieu-pdf', tools: TOOLS, relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
    tips={([1, 2, 3] as const).map(n => s(`${kind}.tips.${n}`))}
    faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
    {children}
  </ImageStudio></div>
}
