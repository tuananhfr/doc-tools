import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'

/** Số thẻ "Hay dùng" ở trang chủ. */
export const FEATURED_TOOL_COUNT = 10
export const READY_TOOL_COUNT = TOOL_CATALOG.filter((tool) => tool.status === 'ready').length

export const HERO_PROMISES = ['noAccount', 'noInstall', 'onDevice'] as const
export const TRUST_ITEMS = [
  { id: 'free', icon: 'gift' },
  { id: 'noAccount', icon: 'shield-check' },
  { id: 'noInstall', icon: 'lightning-charge' },
  { id: 'onDevice', icon: 'lock' },
] as const
