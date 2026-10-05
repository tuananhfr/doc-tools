import { useHubStats } from '../hooks/useHubStats'
import { ProContactButton } from './ProContactButton'

/** Hàng số liệu ở đáy hero trang chọn công cụ. */
export function HeroStats() {
  const stats = useHubStats()

  return (
    <dl className="erp-tools-hero__stats">
      {stats.map((stat) =>
        stat.proOffer ? (
          <div key={stat.label} className="erp-tools-hero__stat erp-tools-hero__stat--pro">
            <dt>
              <strong>{stat.value}</strong> — {stat.label}
            </dt>
            <dd>
              <ProContactButton className="btn-sm" />
            </dd>
          </div>
        ) : (
          <div key={stat.label} className="erp-tools-hero__stat">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ),
      )}
    </dl>
  )
}
