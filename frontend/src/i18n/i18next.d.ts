import 'i18next'
import type common from './messages/vi/common.json'
import type catalog from './messages/vi/catalog.json'
import type site from './messages/vi/site.json'
import type guides from './messages/vi/guides.json'
import type legal from './messages/vi/legal.json'
import type pdf from './messages/vi/pdf.json'
import type ocr from './messages/vi/ocr.json'
import type quality from './messages/vi/quality.json'
import type image from './messages/vi/image.json'
import type qr from './messages/vi/qr.json'
import type utility from './messages/vi/utility.json'
import type orientation from './messages/vi/orientation.json'
import type vietnam from './messages/vi/vietnam.json'
import type finance from './messages/vi/finance.json'
import type family from './messages/vi/family.json'
import type documents from './messages/vi/documents.json'
import type video from './messages/vi/video.json'
import type study from './messages/vi/study.json'
import type safety from './messages/vi/safety.json'
import type construction from './messages/vi/construction.json'
import type community from './messages/vi/community.json'
import type accessibility from './messages/vi/accessibility.json'
import type rules from './messages/vi/rules.json'
import type account from './messages/vi/account.json'
import type ai from './messages/vi/ai.json'

// Vietnamese is the source language: keys missing there are type errors everywhere.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      catalog: typeof catalog
      site: typeof site
      guides: typeof guides
      legal: typeof legal
      pdf: typeof pdf
      ocr: typeof ocr
      quality: typeof quality
      image: typeof image
      qr: typeof qr
      utility: typeof utility
      orientation: typeof orientation
      vietnam: typeof vietnam
      finance: typeof finance
      family: typeof family
      documents: typeof documents
      video: typeof video
      study: typeof study
      safety: typeof safety
      construction: typeof construction
      community: typeof community
      accessibility: typeof accessibility
      rules: typeof rules
      account: typeof account
      ai: typeof ai
    }
  }
}
