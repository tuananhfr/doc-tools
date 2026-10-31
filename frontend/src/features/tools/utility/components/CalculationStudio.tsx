import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

const CONFIG = {
  quick: { id: 'quick-calc', tip: 'studio.quickCalc.tip', steps: ['studio.quickCalc.step1', 'studio.quickCalc.step2', 'studio.quickCalc.step3'] },
  units: { id: 'unit-convert', tip: 'calculationStudio.units.tip', steps: ['calculationStudio.units.step1', 'calculationStudio.units.step2', 'calculationStudio.units.step3'] },
  lunar: { id: 'lunar-calendar', tip: 'studio.lunar.tip', steps: ['studio.lunar.stepBrowse', 'studio.lunar.stepDay', 'studio.lunar.stepConvert'] },
  numbers: { id: 'number-words', tip: 'studio.numberWords.tip', steps: ['studio.numberWords.stepInput', 'studio.numberWords.stepStyle', 'studio.numberWords.stepCopy'] },
  loan: { id: 'loan', tip: 'calculationStudio.loan.tip', steps: ['calculationStudio.loan.step1', 'calculationStudio.loan.step2', 'calculationStudio.loan.step3'] },
  price: { id: 'unit-price', tip: 'studio.unitPrice.tip', steps: ['studio.unitPrice.stepUnit', 'studio.unitPrice.stepInput', 'studio.unitPrice.stepCompare'] },
  study: { id: 'study', tip: 'studio.study.tip', steps: ['studio.study.stepMode', 'studio.study.stepInput', 'studio.study.stepRead'] },
  group: { id: 'group-split', tip: 'studio.group.tip', steps: ['studio.group.stepPeople', 'studio.group.stepExpense', 'studio.group.stepSettle'] },
  money: { id: 'money-calc', tip: 'studio.moneyCalc.tip', steps: ['studio.moneyCalc.step1', 'studio.moneyCalc.step2', 'studio.moneyCalc.step3'] },
  dates: { id: 'date-calc', tip: 'calculationStudio.dates.tip', steps: ['calculationStudio.dates.step1', 'calculationStudio.dates.step2', 'calculationStudio.dates.step3'] },
} as const
const TOOLS = ['unit-convert', 'lunar-calendar', 'number-words', 'loan', 'unit-price', 'study', 'money-calc', 'date-calc']

/** One category menu; preserve the different calculator and calendar workflows. */
export function CalculationStudio({ kind, children }: { kind: keyof typeof CONFIG; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const config = CONFIG[kind]
  const tool = useToolCatalog().find(item => item.id === config.id)!
  const lunar = kind === 'lunar'
  return <div className={`cn-calcstudio cn-calcstudio--${kind}`}><ImageStudio toolId={tool.id} icon={tool.icon} title={tool.name} subtitle={tool.description}
    heroNote={t(lunar ? 'calculationStudio.calendarNote' : 'calculationStudio.heroNote')}
    category={{ title: t('calculationStudio.category'), icon: 'calculator', path: '/', tools: TOOLS, relatedTitle: t('calculationStudio.related') }}
    trustLabels={lunar ? [photo('trust.free'), photo('trust.easy'), photo('trust.noAccount'), t('calculationStudio.calendarTrust')] : undefined}
    steps={config.steps.map(key => t(key))}
    tips={[t(config.tip), t(lunar ? 'calculationStudio.calendarRange' : 'calculationStudio.check'), t(lunar ? 'calculationStudio.calendarPrivacy' : 'calculationStudio.privacy')]}
    faq={[{ q: t('textStudio.accountQ'), a: t('textStudio.accountA') }, { q: t('calculationStudio.networkQ'), a: t(lunar ? 'calculationStudio.calendarPrivacy' : 'calculationStudio.networkA') }]}>
    {children}
  </ImageStudio></div>
}

export function CalculationResultHeading({ icon = 'calculator', title, step = 2 }: { icon?: string; title: string; step?: number }) {
  const { t } = useTranslation('common')
  return <div className="cn-studio-card-head cn-calc-result-heading"><span className="cn-studio-small-icon"><Icon name={icon} /></span><div><h2>{step}. {title}</h2><p>{t('calculationStudio.live')}</p></div></div>
}
