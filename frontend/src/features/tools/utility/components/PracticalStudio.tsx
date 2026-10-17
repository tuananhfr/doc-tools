import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

const CONFIG = {
  address: { id: 'address-conversion', tip: 'studio.address.tip', steps: ['studio.address.stepInput', 'studio.address.stepSource', 'studio.address.stepSave'] },
  payroll: { id: 'payroll', tip: 'studio.payroll.tip', steps: ['studio.payroll.stepInput', 'studio.payroll.stepRules', 'studio.payroll.stepRead'] },
  pomodoro: { id: 'pomodoro', tip: 'studio.pomodoro.tip', steps: ['studio.pomodoro.stepSet', 'studio.pomodoro.stepFocus', 'studio.pomodoro.stepRest'] },
  invoice: { id: 'invoice-xml', tip: 'studio.invoiceXml.tip', steps: ['studio.invoiceXml.step1', 'studio.invoiceXml.step2', 'studio.invoiceXml.step3'] },
  assistant: { id: 'assistant', tip: 'studio.assistant.tip', steps: ['studio.assistant.stepSignIn', 'studio.assistant.stepSetup', 'studio.assistant.stepAsk'] },
} as const
const TOOLS = Object.values(CONFIG).map(config => config.id)

/** The approved workspace frame with the original rules, account gates and task state. */
export function PracticalStudio({ kind, children }: { kind: keyof typeof CONFIG; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const config = CONFIG[kind]
  const tool = useToolCatalog().find(item => item.id === config.id)!
  const assistant = kind === 'assistant'
  const privacy = assistant ? t('studio.assistant.note') : tool.privacyNote ?? t('tool.privacyNoFile')
  return <div className={`cn-calcstudio cn-practicalstudio cn-practicalstudio--${kind}`}>
    <ImageStudio toolId={tool.id} icon={tool.icon} title={tool.name} subtitle={tool.description}
      heroNote={kind === 'payroll' ? t('calculationStudio.heroNote') : kind === 'pomodoro' ? t('calculationStudio.calendarNote') : photo('sideNote')}
      category={{ title: t('dailyStudio.category'), icon: 'grid', path: '/cong-cu', tools: TOOLS, relatedTitle: t('dailyStudio.related') }}
      trustLabels={assistant ? [photo('trust.easy')] : [photo('trust.free'), photo('trust.easy'), photo('trust.noAccount'), t('funStudio.local')]}
      steps={config.steps.map(key => t(key))} tips={[t(config.tip), privacy]}
      faq={[{ q: assistant ? t('studio.assistant.noteTitle') : t('funStudio.processingQ'), a: privacy }]}>
      {assistant ? <p className="cn-practical-notice">{t('studio.assistant.stepSignIn')} {privacy}</p> : null}
      {children}
    </ImageStudio>
  </div>
}
