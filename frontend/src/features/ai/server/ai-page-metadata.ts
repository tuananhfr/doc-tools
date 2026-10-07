import type { Metadata } from 'next'
import { getServerT, pageLocale, type LangParams } from '@/i18n/server'

/** Personal page like the rest of the account area: not indexed, links may still be followed. */
export async function aiSettingsMetadata({ params }: LangParams): Promise<Metadata> {
  const t = await getServerT(await pageLocale(params), 'ai')
  return { title: t('pages.tai-khoan-ai.title'), description: t('pages.tai-khoan-ai.description'), robots: { index: false, follow: true } }
}
