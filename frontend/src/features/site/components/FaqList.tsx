import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { FaqItem } from '../config/support-faq'

export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="cn-faq">
      {items.map((item) => (
        <details key={item.id} id={`hoi-${item.id}`} className="cn-faq-item">
          <summary>{item.question}<Icon name="chevron-down" /></summary>
          <div className="cn-faq-answer">
            <p>{item.answer}</p>
            {item.link ? <Link to={item.link.to}>{item.link.label} <Icon name="arrow-right" /></Link> : null}
          </div>
        </details>
      ))}
    </div>
  )
}
