import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from './ImageStudio'

const TOOLS = ['compress-image', 'remove-metadata', 'image-to-text', 'measure-image', 'batch-image', 'mark-image', 'color', 'crop-image', 'remove-background', 'quick-design']
const IDS = { metadata: 'remove-metadata', ocr: 'image-to-text', measure: 'measure-image', batch: 'batch-image', mark: 'mark-image', color: 'color' } as const

export function ExtendedImageStudio({ kind, children }: { kind: keyof typeof IDS; children: ReactNode }) {
  const { t: s } = useTranslation('image', { keyPrefix: 'extendedStudio' })
  const { t: shared } = useTranslation('image', { keyPrefix: 'utilityStudio' })
  return <div className={`cn-extendedimage cn-extendedimage--${kind}`}><ImageStudio automatic={kind === 'metadata'} toolId={IDS[kind]} icon="images" title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
    category={{ title: shared('category'), icon: 'images', path: '/hinh-anh', tools: TOOLS, relatedTitle: shared('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
    tips={([1, 2, 3] as const).map(n => s(`${kind}.tips.${n}`))}
    faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
    {children}
  </ImageStudio></div>
}
