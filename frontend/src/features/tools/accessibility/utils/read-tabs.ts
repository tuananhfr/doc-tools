import type { ReadInputTab } from '../types/read-listen.types'

/** Thẻ nhập theo thứ tự hiện; thẻ Link chỉ có khi WP4-B bật đọc từ link. */
export function readInputTabs(linkEnabled: boolean): ReadInputTab[] {
  return linkEnabled ? ['text', 'file', 'link'] : ['text', 'file']
}
