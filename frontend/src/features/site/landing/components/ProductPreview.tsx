import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { withBase } from '@/utils/url'

export function ProductPreview({ kind, preload = false }: { kind: 'pdf' | 'directory'; preload?: boolean }) {
  const { t } = useTranslation('site')
  const asset = kind === 'pdf' ? 'pdf-editor' : 'directory'
  return (
    <figure className={`cn-landing-preview cn-landing-preview--${kind}`}>
      <div className="cn-landing-preview-images">
        <Image className="cn-landing-preview-light" src={withBase(`/landing/${asset}-light.webp`)} alt={t(`landing.preview.${kind}`)} width={1440} height={900} sizes="(max-width: 767px) 94vw, (max-width: 1100px) 88vw, 900px" preload={preload} />
        <Image className="cn-landing-preview-dark" src={withBase(`/landing/${asset}-dark.webp`)} alt={t(`landing.preview.${kind}`)} width={1440} height={900} sizes="(max-width: 767px) 94vw, (max-width: 1100px) 88vw, 900px" />
      </div>
      <figcaption>{t('landing.preview.sample')}</figcaption>
    </figure>
  )
}
