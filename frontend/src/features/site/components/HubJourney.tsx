import { Icon } from '@/components/ui/Icon'
import type { HubPage } from '../types/hub-page.types'
import { MultilineText } from './MultilineText'

export function HubJourney({ journey }: { journey: HubPage['journey'] }) {
  return (
    <section className="cn-container cn-hub-journey" aria-labelledby="cn-hub-journey-title">
      <h2 id="cn-hub-journey-title">{journey.title}</h2>
      <div className="cn-hub-journey-body">
        <ol className={`cn-hub-journey-steps${journey.flow ? ' is-flow' : ''}`}>
          {journey.steps.map((step) => (
            <li key={step.title}>
              <Icon name={step.icon} />
              <span><strong>{step.title}</strong><small>{step.detail}</small></span>
            </li>
          ))}
        </ol>
        <p className="cn-hub-journey-motto" aria-hidden="true"><MultilineText text={journey.motto} /></p>
      </div>
    </section>
  )
}
