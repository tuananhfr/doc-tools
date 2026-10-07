import type { HeadingStatus } from '../hooks/useDeviceHeading'
import type { Stability } from '../utils/device-heading'

/** Khoá câu báo lỗi trong `orientation:heading.failure.*`. */
export type HeadingFailure = 'unsupported' | 'insecure' | 'denied' | 'noSignal'

export const HEADING_FAILURE: Partial<Record<HeadingStatus, HeadingFailure>> = {
  unsupported: 'unsupported',
  insecure: 'insecure',
  denied: 'denied',
  'no-signal': 'noSignal',
}

/** Nhãn ở `orientation:heading.stability.<Stability>`. */
export const STABILITY_BADGE: Record<Stability, { icon: string; tone: string }> = {
  STABLE: { icon: 'check-circle', tone: 'success' },
  WOBBLY: { icon: 'exclamation-circle', tone: 'warning' },
  UNSTABLE: { icon: 'exclamation-triangle', tone: 'danger' },
}
