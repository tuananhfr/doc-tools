import type { HeadingStatus } from '../hooks/useDeviceHeading'
import type { Stability } from '../utils/device-heading'

export const HEADING_FAILURE: Partial<Record<HeadingStatus, string>> = {
  unsupported: 'Trình duyệt này không đọc được la bàn của máy.',
  insecure: 'La bàn chỉ chạy khi mở trang bằng HTTPS.',
  denied: 'Bạn chưa cho phép đọc cảm biến hướng. Cho phép trong cài đặt trình duyệt rồi thử lại.',
  'no-signal': 'Không nhận được tín hiệu la bàn — máy tính và nhiều trình duyệt không có cảm biến này.',
}

export const STABILITY_BADGE: Record<Stability, { label: string; icon: string; tone: string }> = {
  STABLE: { label: 'Ổn định', icon: 'check-circle', tone: 'success' },
  WOBBLY: { label: 'Còn dao động', icon: 'exclamation-circle', tone: 'warning' },
  UNSTABLE: { label: 'Không ổn định', icon: 'exclamation-triangle', tone: 'danger' },
}
