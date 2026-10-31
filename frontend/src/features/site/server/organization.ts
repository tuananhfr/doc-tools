import { SITE_BRAND_MARK } from '../config/brand-assets'
import { appConfig } from '@/config/app.config'
import { withBase } from '@/utils/url'
import { SITE_IDENTITY } from '../config/site-identity'

export function organizationData() {
  const url = new URL(withBase('/'), appConfig.siteUrl).href
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': url + '#organization',
    name: SITE_IDENTITY.name,
    url,
    logo: new URL(withBase(SITE_BRAND_MARK), appConfig.siteUrl).href,
    email: SITE_IDENTITY.email,
    telephone: SITE_IDENTITY.telephone,
    parentOrganization: { '@type': 'Organization', name: SITE_IDENTITY.owner },
    contactPoint: {
      '@type': 'ContactPoint', contactType: 'customer support',
      email: SITE_IDENTITY.email, telephone: SITE_IDENTITY.telephone,
    },
  }
}
