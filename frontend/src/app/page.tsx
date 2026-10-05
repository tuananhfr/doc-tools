import { withBase } from '@/utils/url'
import type { Metadata } from 'next'
import { HOME_TITLE } from '@/features/site/config/home-content'
export const metadata: Metadata = { title: HOME_TITLE, alternates: { canonical: withBase('/') }, openGraph: { title: HOME_TITLE, url: withBase('/') } }
export default function HubRoute() { return null }
