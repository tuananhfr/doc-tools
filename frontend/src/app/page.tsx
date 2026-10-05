import type { Metadata } from 'next'
import { HOME_TITLE } from '@/features/site/config/home-content'
export const metadata: Metadata = { title: HOME_TITLE, alternates: { canonical: '/' }, openGraph: { title: HOME_TITLE, url: '/' } }
export default function HubRoute() { return null }
