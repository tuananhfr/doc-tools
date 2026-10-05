import { READY_TOOL_COUNT } from '@/features/site/config/home-content'

export function HeroStats() {
  return (
    <dl className="cn-hero-stats">
      <div><dt>công cụ miễn phí</dt><dd>{READY_TOOL_COUNT}</dd></div>
      <div><dt>dùng miễn phí</dt><dd>100%</dd></div>
      <div><dt>cài đặt</dt><dd>0</dd></div>
    </dl>
  )
}
