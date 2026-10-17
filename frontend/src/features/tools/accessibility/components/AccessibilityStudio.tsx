import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'

export function AccessibilityStudio({ kind, children }: { kind: 'dictation' | 'magnifier'; children: ReactNode }) {
  const { t: s } = useTranslation('accessibility', { keyPrefix: 'studio' })
  const dictation = kind === 'dictation'
  return <div className={`cn-accessstudio cn-accessstudio--${kind}`}><ImageStudio toolId={kind} icon={dictation ? 'mic' : 'zoom-in'} title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={s(`${kind}.heroNote`)}
    trustLabels={[s('free'), s('easy'), s('noAccount'), s(dictation ? 'browserVoice' : 'localCamera')]}
    category={{ title: s('category'), icon: 'headphones', path: '/doc-va-nghe', tools: ['dictation', 'read-aloud', 'magnifier', 'image-to-text', 'ocr', 'char-count'], relatedTitle: s('related') }}
    steps={([1, 2, 3, 4, 5] as const).map(n => s(`${kind}.steps.${n}`))}
    tips={([1, 2, 3] as const).map(n => s(`${kind}.tips.${n}`))}
    faq={([1, 2, 3] as const).map(n => ({ q: s(`${kind}.faq.${n}.q`), a: s(`${kind}.faq.${n}.a`) }))}>
    {children}
  </ImageStudio></div>
}
