import { DRAW_SPREADS } from '../config/draw-spreads'

export function SpreadGuide({ amount }: { amount: number }) {
  const spread = DRAW_SPREADS[amount]
  if (!spread) return null
  return <div className="cn-ent-spread-guide" lang="vi" dir="ltr">
    <strong>{spread.title}</strong>
    <ol>{spread.positions.map(position => <li key={position.title}>{position.title}</li>)}</ol>
  </div>
}
