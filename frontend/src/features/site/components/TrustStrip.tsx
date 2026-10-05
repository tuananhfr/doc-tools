import { Icon } from '@/components/ui/Icon'
import { TRUST_ITEMS } from '../config/home-content'

export function TrustStrip() {
  return (
    <section id="du-lieu" className="cn-trust-strip" aria-label="Cam kết sử dụng">
      <ul className="cn-container cn-trust-items">
        {TRUST_ITEMS.map((item) => <li key={item.title}><Icon name={item.icon} /><div><strong>{item.title}</strong><span>{item.description}</span></div></li>)}
      </ul>
    </section>
  )
}
