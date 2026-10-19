import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

const CONFIG = {
  lunar: { id: 'lunar-calendar', tip: 'studio.lunar.tip', steps: ['studio.lunar.stepBrowse', 'studio.lunar.stepDay', 'studio.lunar.stepConvert'] },
  electricity: { id: 'electricity', tip: 'studio.electricity.tip', steps: ['studio.electricity.step1', 'studio.electricity.step2', 'studio.electricity.step3'] },
  study: { id: 'study', tip: 'studio.study.tip', steps: ['studio.study.stepMode', 'studio.study.stepInput', 'studio.study.stepRead'] },
  group: { id: 'group-split', tip: 'studio.group.tip', steps: ['studio.group.stepPeople', 'studio.group.stepExpense', 'studio.group.stepSettle'] },
  flashcards: { id: 'flashcards', tip: 'studio.flashcard.tip', steps: ['studio.flashcard.step1', 'studio.flashcard.step2', 'studio.flashcard.step3'] },
  compass: { id: 'house-orientation', tip: 'studio.compass.tip', steps: ['studio.compass.stepMeasure', 'studio.compass.stepLock', 'studio.compass.stepSave'] },
} as const
const TOOLS = Object.values(CONFIG).map(config => config.id)

export function DailyStudio({ kind, children }: { kind: keyof typeof CONFIG; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const config = CONFIG[kind]
  const tool = useToolCatalog().find(item => item.id === config.id)!
  const privacy = kind === 'lunar' ? 'calculationStudio.calendarPrivacy' : kind === 'electricity' ? 'dailyStudio.electricityPrivacy' : kind === 'compass' ? 'dailyStudio.compassPrivacy' : kind === 'flashcards' ? 'dailyStudio.flashcardPrivacy' : 'calculationStudio.privacy'
  const note = kind === 'lunar' ? 'calculationStudio.calendarNote' : kind === 'flashcards' ? 'dailyStudio.flashcardNote' : kind === 'compass' ? 'dailyStudio.compassNote' : 'calculationStudio.heroNote'
  return <div className={`cn-calcstudio cn-calcstudio--${kind} cn-dailystudio cn-dailystudio--${kind}`}><ImageStudio toolId={tool.id} icon={tool.icon} title={tool.name} subtitle={tool.description}
    heroNote={t(note)} category={{ title: t('dailyStudio.category'), icon: 'grid', path: '/', tools: TOOLS, relatedTitle: t('dailyStudio.related') }}
    trustLabels={[photo('trust.free'), photo('trust.easy'), photo('trust.noAccount'), t(kind === 'electricity' ? 'dailyStudio.sourceTrust' : kind === 'compass' ? 'dailyStudio.compassTrust' : kind === 'lunar' ? 'calculationStudio.calendarTrust' : 'funStudio.local')]}
    steps={config.steps.map(key => t(key))} tips={[t(config.tip), t(privacy)]}
    faq={[{ q: t('textStudio.accountQ'), a: t('textStudio.accountA') }, { q: t('funStudio.processingQ'), a: t(privacy) }]}>{children}</ImageStudio></div>
}
