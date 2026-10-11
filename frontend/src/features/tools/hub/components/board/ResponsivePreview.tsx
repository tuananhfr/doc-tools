import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function ResponsivePreview({ children, preview, action }: { children: ReactNode; preview: ReactNode; action?: ReactNode }) {
  const { t } = useTranslation('common')
  const id = useId()
  const [view, setView] = useState('input')
  return <div className="cn-responsive-preview" data-view={view}>
    <div className="cn-responsive-preview__tabs" role="tablist">
      {(['input', 'preview'] as const).map(value => <button type="button" role="tab" key={value} id={`${id}-${value}-tab`} aria-controls={`${id}-${value}`} aria-selected={view === value} onClick={() => setView(value)}>{t(`workspace.${value}`)}</button>)}
    </div>
    <section className="cn-responsive-preview__input" id={`${id}-input`} aria-labelledby={`${id}-input-tab`}>{children}</section>
    <section className="cn-responsive-preview__output" id={`${id}-preview`} aria-labelledby={`${id}-preview-tab`}>{action ? <div className="cn-preview-action">{action}</div> : null}{preview}</section>
  </div>
}
