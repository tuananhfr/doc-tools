import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

const CONFIG = {
  numerology: { id: 'numerology', tip: 'studio.numerology.tip', steps: ['studio.numerology.stepFill', 'studio.numerology.stepCalculate', 'studio.numerology.stepRead'] },
  cards: { id: 'playing-cards', tip: 'studio.playing.tip', steps: ['studio.playing.stepChoose', 'studio.playing.stepReveal', 'studio.playing.stepRead'] },
  tarot: { id: 'tarot', tip: 'studio.tarot.tip', steps: ['studio.tarot.stepChoose', 'studio.tarot.stepReveal', 'studio.tarot.stepRead'] },
  wheel: { id: 'spin-wheel', tip: 'studio.wheel.tip', steps: ['studio.wheel.step1', 'studio.wheel.step2', 'studio.wheel.step3'] },
  lunar: { id: 'lunar-calendar', tip: 'studio.lunar.tip', steps: ['studio.lunar.stepBrowse', 'studio.lunar.stepDay', 'studio.lunar.stepConvert'] },
} as const
const TOOLS = ['numerology', 'playing-cards', 'tarot', 'spin-wheel', 'lunar-calendar']

/** The entertainment reference, with accurate local/server processing labels. */
export function EntertainmentStudio({ kind, children }: { kind: keyof typeof CONFIG; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const config = CONFIG[kind]
  const tool = useToolCatalog().find(item => item.id === config.id)!
  const privacy = kind === 'wheel' ? 'funStudio.wheelPrivacy' : kind === 'lunar' ? 'calculationStudio.calendarPrivacy' : kind === 'numerology' ? 'funStudio.numberPrivacy' : 'funStudio.cardPrivacy'
  return <div className={`cn-funstudio cn-funstudio--${kind}${kind === 'lunar' ? ' cn-calcstudio cn-calcstudio--lunar' : ''}`}><ImageStudio toolId={tool.id} icon={tool.icon} title={tool.name} subtitle={tool.description}
    heroNote={t(kind === 'lunar' ? 'calculationStudio.calendarNote' : 'funStudio.heroNote')}
    category={{ title: t('funStudio.category'), icon: 'stars', path: '/cong-cu', tools: TOOLS, relatedTitle: t('funStudio.related') }}
    trustLabels={[photo('trust.free'), photo('trust.easy'), photo('trust.noAccount'), t(kind === 'wheel' ? 'funStudio.local' : kind === 'lunar' ? 'calculationStudio.calendarTrust' : 'funStudio.network')]}
    steps={config.steps.map(key => t(key))}
    tips={[t(config.tip), t(kind === 'wheel' ? 'funStudio.wheelTip' : 'funStudio.reference'), t(privacy)]}
    faq={[{ q: t('textStudio.accountQ'), a: t('textStudio.accountA') }, { q: t('funStudio.processingQ'), a: t(privacy) }]}>
    {children}
  </ImageStudio></div>
}
