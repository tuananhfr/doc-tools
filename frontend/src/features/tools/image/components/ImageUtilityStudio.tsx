import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from './ImageStudio'

const IDS = { compress: 'compress-image', background: 'remove-background', design: 'quick-design' } as const

export function ImageUtilityStudio({ kind, children }: { kind: keyof typeof IDS; children: ReactNode }) {
  const { t: s } = useTranslation('image', { keyPrefix: 'utilityStudio' })
  return <div className={`cn-imageutility cn-imageutility--${kind}`}><ImageStudio automatic={kind === 'compress'} toolId={IDS[kind]} icon={kind === 'compress' ? 'file-earmark-zip' : kind === 'background' ? 'eraser' : 'palette2'} title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
    category={{ title: s('category'), icon: 'images', path: '/hinh-anh', tools: ['id-photo', 'crop-image', 'remove-background', 'compress-image', 'convert-image', 'collage', 'quick-design'], relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
    tips={([1, 2, 3, 4] as const).map(n => s(`${kind}.tips.${n}`))}
    faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
    {children}
  </ImageStudio></div>
}
