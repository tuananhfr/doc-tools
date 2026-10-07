import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { FilePicker, ToolPanel, cameraAvailable, type FlowRejected } from '@/features/tools/hub'
import { CameraCapture } from '@/features/tools/image'

interface SourcePickerProps {
  loading: boolean
  rejected: FlowRejected | null
  onDismissRejected: () => void
  onFiles: (files: File[]) => void
  onNone: () => void
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'

/** Bước 1 (spec v1.1 §3): chụp / chọn ảnh, PDF bản vẽ, hoặc không ảnh — la bàn đứng riêng. */
export function SourcePicker({ loading, rejected, onDismissRejected, onFiles, onNone }: SourcePickerProps) {
  const { t } = useTranslation('orientation')
  const [camera, setCamera] = useState(false)

  return (
    <ToolPanel title={t('source.title')}>
      <FilePicker
        accept={ACCEPT}
        multiple={false}
        title={t('source.pickTitle')}
        hint={t('source.pickHint')}
        compact={false}
        loading={loading ? { done: 0, total: 1 } : null}
        disabled={loading}
        onFiles={onFiles}
        extra={
          cameraAvailable() ? (
            <Button variant="outline-secondary" className="erp-flow-picker__pick" disabled={loading} onClick={() => setCamera(true)}>
              <Icon name="camera" className="me-2" />
              {t('source.camera')}
            </Button>
          ) : null
        }
      />

      {rejected ? (
        <div className="erp-flow-rejected" role="alert">
          <Icon name="exclamation-triangle" className="erp-flow-rejected__icon" />
          <div className="erp-flow-rejected__body">
            <p className="erp-flow-rejected__title">{t('source.rejectedTitle')}</p>
            <ul className="erp-flow-rejected__list">
              <li data-code={rejected.code}>
                <strong>{rejected.name}</strong> — {rejected.reason}
              </li>
            </ul>
          </div>
          <button type="button" className="btn erp-flow-rejected__close" aria-label={t('source.dismiss')} onClick={onDismissRejected}>
            <Icon name="x-lg" />
          </button>
        </div>
      ) : null}

      <div className="erp-orient-nofile">
        <Button variant="outline-secondary" disabled={loading} onClick={onNone}>
          <Icon name="compass" className="me-2" />
          {t('source.none')}
        </Button>
        <span className="erp-orient-nofile__hint">{t('source.noneHint')}</span>
      </div>

      <CameraCapture
        show={camera}
        onClose={() => setCamera(false)}
        onDone={(files) => {
          setCamera(false)
          onFiles(files.slice(0, 1))
        }}
      />
    </ToolPanel>
  )
}
