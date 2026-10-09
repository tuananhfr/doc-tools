import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { WORKFLOW_STEPS } from '../config/landing-content'

export function HowItWorksSection() {
  const { t } = useTranslation('site')
  return (
    <section id="cach-dung" className="cn-landing-section cn-landing-container cn-landing-workflow" aria-labelledby="cn-landing-workflow-title">
      <div className="cn-landing-section-heading"><h2 id="cn-landing-workflow-title">{t('landing.steps.title')}</h2><p>{t('landing.steps.body')}</p></div>
      <ol>{WORKFLOW_STEPS.map((step, index) => <li key={step.key}><span className="cn-landing-step-number" aria-hidden="true">{index + 1}</span><Icon name={step.icon} className="cn-landing-step-icon" /><h3>{t(`landing.steps.${step.key}.title`)}</h3><p>{t(`landing.steps.${step.key}.body`)}</p></li>)}</ol>
      <Link to="/cong-cu" className="cn-landing-button">{t('landing.openTools')}<Icon name="arrow-right" /></Link><p className="cn-landing-note">{t('landing.steps.note')}</p>
    </section>
  )
}
