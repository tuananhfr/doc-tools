import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

const CONFIG = {
  cv: { id: 'cv', tip: 'studio.cv.tip', steps: ['textStudio.cvTemplateStep', 'studio.cv.stepFill', 'studio.cv.stepSave'] },
  forms: { id: 'form-templates', tip: 'studio.formTemplates.tip', steps: ['studio.formTemplates.step1', 'studio.formTemplates.step2', 'studio.formTemplates.step3'] },
  numbers: { id: 'number-words', tip: 'studio.numberWords.tip', steps: ['studio.numberWords.stepInput', 'studio.numberWords.stepStyle', 'studio.numberWords.stepCopy'] },
  font: { id: 'legacy-font', tip: 'studio.legacyFont.tip', steps: ['studio.legacyFont.step1', 'studio.legacyFont.step2', 'studio.legacyFont.step3'] },
  count: { id: 'char-count', tip: 'studio.charCount.tip', steps: ['studio.charCount.step1', 'studio.charCount.step2', 'studio.charCount.step3'] },
} as const
const TOOLS = ['cv', 'form-templates', 'office-word', 'office-sheet', 'office-slide', 'number-words', 'legacy-font', 'char-count']

/** The document reference for templates; input/result cards for live text tools. */
export function TextDocumentStudio({ kind, children }: { kind: keyof typeof CONFIG; children: ReactNode }) {
  const { t } = useTranslation('common')
  const catalog = useToolCatalog()
  const config = CONFIG[kind]
  const tool = catalog.find(item => item.id === config.id)!
  return <div className={`cn-textstudio cn-textstudio--${kind}`}><ImageStudio toolId={tool.id} icon={tool.icon} title={tool.name} subtitle={tool.description}
    heroNote={t(kind === 'cv' || kind === 'forms' ? 'textStudio.documentNote' : 'textStudio.textNote')}
    category={{ title: t('textStudio.category'), icon: 'file-earmark-text', path: '/?nhom=mau-giay-to', tools: TOOLS, relatedTitle: t('textStudio.related') }}
    steps={config.steps.map(key => t(key))}
    tips={[t(config.tip), t('textStudio.check'), t('textStudio.privacy')]}
    faq={[{ q: t('textStudio.accountQ'), a: t('textStudio.accountA') }, { q: t('textStudio.privacyQ'), a: t(kind === 'cv' ? 'textStudio.cvPrivacyA' : 'textStudio.privacyA') }]}>
    {children}
  </ImageStudio></div>
}

export function DocumentTemplateLayout({ templates, children, preview, actions }: { templates: ReactNode; children: ReactNode; preview: ReactNode; actions: ReactNode }) {
  const { t } = useTranslation('common')
  return <div className="cn-documentstudio-workspace">
    <section className="cn-idstudio-panel cn-documentstudio-templates"><h2><span>1</span>{t('textStudio.templates')}</h2>{templates}</section>
    <div className="cn-documentstudio-columns">
      <div className="cn-documentstudio-input">{children}</div>
      <section className="cn-idstudio-panel cn-documentstudio-output"><h2><span>3</span>{t('textStudio.preview')}</h2><div className="cn-documentstudio-actions">{actions}</div><div className="cn-documentstudio-paper">{preview}</div></section>
    </div>
  </div>
}
