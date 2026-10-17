import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'

/** Video/audio reference frame with one category menu and task-specific guidance. */
export function MediaStudio({ kind, children }: { kind: 'trim' | 'compress' | 'gif' | 'read'; children: ReactNode }) {
  const { t: s } = useTranslation('video', { keyPrefix: 'mediaStudio' })
  const read = kind === 'read'
  const toolId = kind === 'compress' ? 'compress-video' : kind === 'gif' ? 'video-gif' : read ? 'read-aloud' : 'trim-video'
  return <div className={`cn-mediastudio cn-mediastudio--${kind}`}>
    <ImageStudio toolId={toolId} icon={read ? 'volume-up' : 'scissors'} title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
      trustLabels={[s('free'), s('easy'), s('noAccount'), s(read ? 'voiceChoice' : 'local')]}
      category={{ title: s(read ? 'readCategory' : 'videoCategory'), icon: read ? 'headphones' : 'film', path: read ? '/doc-va-nghe' : '/hinh-anh', tools: read ? ['read-aloud', 'dictation', 'ocr'] : ['trim-video', 'compress-video', 'video-gif', 'extract-audio', 'read-aloud'], relatedTitle: s('related') }}
      steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
      tips={([1, 2, 3, 4] as const).map(n => s(`${kind}.tips.${n}`))}
      faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
      {children}
    </ImageStudio>
  </div>
}
