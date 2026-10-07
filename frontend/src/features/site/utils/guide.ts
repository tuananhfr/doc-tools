import type { TFunction } from 'i18next'
import type { GuideSlug, GuideText } from '../config/guides'

export function guideText(t: TFunction<'guides'>, slug: GuideSlug): GuideText {
  return t(`items.${slug}`, { returnObjects: true })
}
