import { appConfig } from '@/config/app.config'
import { withBase } from '@/utils/url'

/** The address host sites proxy to; also where staff open the live page. */
export const landingPublicUrl = (key: string) => appConfig.siteUrl.replace(/\/+$/, '') + withBase(`/gioi-thieu/${key}`)
