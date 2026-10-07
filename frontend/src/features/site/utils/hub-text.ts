import type { TFunction } from 'i18next'
import type { HubPageSlug, HubPageText } from '../types/hub-page.types'

/** Cả khối chữ của một trang nhóm; id khai trong `hub-pages.ts` tra vào các bảng con. */
export function hubText(t: TFunction<'site'>, slug: HubPageSlug): HubPageText {
  return t(`hubs.${slug}`, { returnObjects: true })
}
