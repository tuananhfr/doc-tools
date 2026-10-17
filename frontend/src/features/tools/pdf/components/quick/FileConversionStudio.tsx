import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'

/** Scan.png is the reference for conversion, distinct from PDF editing. */
export function FileConversionStudio({ children, kind = 'convert' }: { children: ReactNode; kind?: 'convert' | 'images' | 'ocr' | 'imageText' }) {
  const { t: s } = useTranslation('pdf', { keyPrefix: 'quickStudio' })
  const { t: c } = useTranslation('pdf', { keyPrefix: 'conversionStudio' })
  return <div className={`cn-pdfquickstudio cn-fileconversionstudio cn-fileconversionstudio--${kind}`}><ImageStudio toolId={kind === 'images' ? 'pdf-to-image' : kind === 'ocr' ? 'ocr' : kind === 'imageText' ? 'image-to-text' : 'convert-file'} icon="arrow-left-right" title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
    category={{ title: c('category'), icon: 'upc-scan', path: '/tai-lieu-pdf', tools: ['convert-file', 'convert-image', 'pdf-to-image', 'scan-to-pdf', 'image-to-text', 'ocr', 'edit-pdf'], relatedTitle: c('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
    tips={([1, 2, 3] as const).map(n => s(`${kind}.tips.${n}`))}
    faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
    {children}
  </ImageStudio></div>
}
