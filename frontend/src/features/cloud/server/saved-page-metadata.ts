import type { Metadata } from 'next'
import { getServerT, pageLocale, type LangParams } from '@/i18n/server'

/** Personal page like the rest of the account area: not indexed, links may still be followed. */
export async function savedPageMetadata({ params }: LangParams): Promise<Metadata> {
  const t = await getServerT(await pageLocale(params), 'cloud')
  return { title: t('pages.tai-khoan-da-luu.title'), description: t('pages.tai-khoan-da-luu.description'), robots: { index: false, follow: true } }
}
