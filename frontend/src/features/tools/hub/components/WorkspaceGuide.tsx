import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'

interface WorkspaceGuideProps {
  steps: readonly string[]
  tip?: string
  note?: string
  noteTitle?: string
  noteIcon?: string
}

/** Shared, short guidance alongside a tool's working area. */
export function WorkspaceGuide({ steps, tip, note, noteTitle, noteIcon = 'shield-check' }: WorkspaceGuideProps) {
  const { t } = useTranslation('common')
  const titleId = useId()
  return <div className="cn-studio-guidance">
    <section className="cn-studio-guide" aria-labelledby={titleId}>
      <h2 id={titleId}><span className="cn-studio-small-icon"><Icon name="signpost-split" /></span>{t('studio.howTitle')}</h2>
      <ol>{steps.map((step, index) => <li key={step}><span className="cn-studio-step" aria-hidden="true">{index + 1}</span><span>{step}</span></li>)}</ol>
    </section>
    {note ? <section className="cn-studio-note">
      <Icon name={noteIcon} />
      <div><h3>{noteTitle ?? t('studio.privacyTitle')}</h3><p>{note}</p></div>
    </section> : null}
    {tip ? <section className="cn-studio-tip">
      <Icon name="lightbulb" />
      <div><h3>{t('studio.tipTitle')}</h3><p>{tip}</p></div>
    </section> : null}
  </div>
}
