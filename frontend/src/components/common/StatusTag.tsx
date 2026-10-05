import { Icon } from '@/components/ui'
import { STATUS_TONE_ICON } from './status-tone'
import type { StatusTone } from './status-tone'

export interface StatusMeta {
  label: string
  tone: StatusTone
}

interface StatusTagProps {
  value?: string
  /** Bang tra cua tung domain, vd CUSTOMER_STATUS_META. */
  meta: Record<string, StatusMeta>
}

/**
 * Badge trang thai: semantic soft fill + icon + nhan chu.
 * Khong bao gio truyen dat trang thai chi bang mau (muc 05 & 11).
 */
export function StatusTag({ value, meta }: StatusTagProps) {
  if (!value) return <span>—</span>

  const item = meta[value]
  const tone = item?.tone ?? 'neutral'

  return (
    <span className={`erp-badge erp-badge--${tone}`}>
      <Icon name={STATUS_TONE_ICON[tone]} />
      {item?.label ?? value}
    </span>
  )
}
