import { Icon } from '@/components/ui/Icon'
import type { HubPage, HubPageText } from '../types/hub-page.types'
import { MultilineText } from './MultilineText'

export function HubJourney({ journey, text }: { journey: HubPage['journey']; text: HubPageText['journey'] }) {
  return (
    <section className="cn-container cn-hub-journey" aria-labelledby="cn-hub-journey-title">
      <h2 id="cn-hub-journey-title">{text.title}</h2>
      <div className="cn-hub-journey-body">
        <ol className={`cn-hub-journey-steps${journey.flow ? ' is-flow' : ''}`}>
          {journey.steps.map((step) => (
            <li key={step.id}>
              <Icon name={step.icon} />
              <span><strong>{text.steps[step.id].title}</strong><small>{text.steps[step.id].detail}</small></span>
            </li>
          ))}
        </ol>
        <p className="cn-hub-journey-motto" aria-hidden="true"><MultilineText text={text.motto} /></p>
      </div>
    </section>
  )
}
