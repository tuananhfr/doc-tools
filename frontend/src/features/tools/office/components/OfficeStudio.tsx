import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import type { OfficeAppId } from '../config/office-apps'

export function OfficeStudio({ app, children }: { app: OfficeAppId; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { t: photo } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const tool = useToolCatalog().find(item => item.id === app)!
  const guide = app === 'office-sheet' ? 'studio.sheet' : app === 'office-slide' ? 'officeStudio.slides' : 'studio.office'
  return <div className={`cn-officestudio cn-officestudio--${app}`}><ImageStudio toolId={app} icon={tool.icon} title={tool.name} subtitle={tool.description}
    heroNote={t('officeStudio.heroNote')}
    category={{ title: t('officeStudio.category'), icon: 'file-earmark-richtext', path: '/cong-cu', tools: ['office-word', 'office-sheet', 'office-slide'], relatedTitle: t('officeStudio.related') }}
    trustLabels={[photo('trust.free'), photo('trust.noAccount'), t('funStudio.local'), t('officeStudio.formats')]}
    steps={(['stepOpen', 'stepEdit', 'stepSave'] as const).map(step => t(`${guide}.${step}`))}
    tips={[t(`${guide}.tip`), t('office.languageNote'), t('office.limit')]}
    faq={[{ q: t('textStudio.accountQ'), a: t('textStudio.accountA') }, { q: t('officeStudio.saveQ'), a: t(`${guide}.note`) }]}>{children}</ImageStudio></div>
}
