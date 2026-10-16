import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from './ImageStudio'

export function IdPhotoStudio({ children }: { children: ReactNode }) {
  const { t } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  return <ImageStudio toolId="id-photo" icon="camera-fill" title={t('title')} subtitle={t('subtitle')} heroNote={t('heroNote')}
    steps={([1, 2, 3, 4, 5] as const).map(step => t(`steps.${step}`))}
    tips={([1, 2, 3, 4, 5] as const).map(tip => t(`tips.${tip}`))}
    faq={([1, 2, 3, 4] as const).map(item => ({ q: t(`faq.${item}.q`), a: t(`faq.${item}.a`) }))}>
    {children}
  </ImageStudio>
}
