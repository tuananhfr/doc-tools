import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { withBase } from '@/utils/url'

export function CardArtwork({ path, label, reversed = false }: { path: string; label: string; reversed?: boolean }) {
  const [failed, setFailed] = useState(false)
  const { t } = useTranslation('entertainment')
  return failed ? <span className="cn-ent-card-fallback"><strong>{label}</strong><small>{t('artwork.unavailable')}</small></span>
    : <img className={reversed ? 'cn-ent-card-image is-reversed' : 'cn-ent-card-image'} src={withBase(path)} alt={label} loading="lazy" decoding="async" onError={() => setFailed(true)} />
}
