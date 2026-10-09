import { useContext, useId, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { withBase } from '@/utils/url'
import { LANDING_IMAGE_TYPES } from '../../config/landing-form'
import { useUploadLandingAsset } from '../../hooks/useLandings'
import { ErrorText } from '../AdminKit'
import { LandingFieldError } from './LandingFields'

interface LandingImageFieldProps {
  label: string
  path: string
  value: string | null
  /** Picture the page shows while the slot is empty (a file in `public/`). */
  fallback: string
  onChange: (value: string | null) => void
  hint?: string
}

export function LandingImageField({ label, path, value, fallback, onChange, hint }: LandingImageFieldProps) {
  const upload = useUploadLandingAsset()
  const input = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const error = useContext(LandingFieldError)
  const message = error?.field === path ? error.message : null
  const src = withBase(value ? `/api/v1/landings/assets/${value}` : fallback)

  const pick = (file: File | undefined) => {
    if (!file) return
    upload.mutate(file, { onSuccess: (asset) => onChange(asset.id) })
    // Clearing lets the same file be picked again after an error.
    if (input.current) input.current.value = ''
  }

  return (
    <div className="cn-admin-limage" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="cn-admin-lfield__head"><span>{label}</span></span>
      <div className="cn-admin-limage__row">
        <img className="cn-admin-limage__thumb" src={src} alt="" loading="lazy" />
        <div className="cn-admin-limage__actions">
          <span className="cn-admin-sub">{value ? 'Ảnh đã tải lên' : 'Đang dùng ảnh mặc định'}</span>
          <div className="cn-admin-form__actions">
            <button type="button" className="cn-admin-button is-ghost" disabled={upload.isPending} onClick={() => input.current?.click()}>
              <Icon name={upload.isPending ? 'hourglass-split' : 'upload'} />{upload.isPending ? 'Đang tải…' : value ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </button>
            {value ? <button type="button" className="cn-admin-link" disabled={upload.isPending} onClick={() => onChange(null)}>Về ảnh mặc định</button> : null}
          </div>
          <input ref={input} type="file" name={path} accept={LANDING_IMAGE_TYPES} hidden onChange={(event) => pick(event.target.files?.[0])} />
          {hint ? <span className="cn-admin-sub">{hint}</span> : null}
        </div>
      </div>
      <ErrorText error={upload.error} />
      {message ? <p className="cn-admin-error" role="alert"><Icon name="exclamation-circle" />{message}</p> : null}
    </div>
  )
}
