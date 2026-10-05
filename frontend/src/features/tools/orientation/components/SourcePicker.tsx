import { useState } from 'react'
import { Button } from 'react-bootstrap'
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
  const [camera, setCamera] = useState(false)

  return (
    <ToolPanel title="Bạn có gì trong tay?">
      <FilePicker
        accept={ACCEPT}
        multiple={false}
        title="Chọn ảnh mặt bằng, ảnh chụp nhà hoặc PDF bản vẽ"
        hint="JPG, PNG, WebP, PDF · tối đa 100 MB · tệp chỉ mở trên máy bạn"
        compact={false}
        loading={loading ? { done: 0, total: 1 } : null}
        disabled={loading}
        onFiles={onFiles}
        extra={
          cameraAvailable() ? (
            <Button variant="outline-secondary" className="erp-flow-picker__pick" disabled={loading} onClick={() => setCamera(true)}>
              <Icon name="camera" className="me-2" />
              Chụp ảnh
            </Button>
          ) : null
        }
      />

      {rejected ? (
        <div className="erp-flow-rejected" role="alert">
          <Icon name="exclamation-triangle" className="erp-flow-rejected__icon" />
          <div className="erp-flow-rejected__body">
            <p className="erp-flow-rejected__title">Không mở được tệp</p>
            <ul className="erp-flow-rejected__list">
              <li data-code={rejected.code}>
                <strong>{rejected.name}</strong> — {rejected.reason}
              </li>
            </ul>
          </div>
          <button type="button" className="btn erp-flow-rejected__close" aria-label="Ẩn thông báo" onClick={onDismissRejected}>
            <Icon name="x-lg" />
          </button>
        </div>
      ) : null}

      <div className="erp-orient-nofile">
        <Button variant="outline-secondary" disabled={loading} onClick={onNone}>
          <Icon name="compass" className="me-2" />
          Không có ảnh — chỉ dùng la bàn
        </Button>
        <span className="erp-orient-nofile__hint">Đo bằng la bàn điện thoại hoặc nhập số độ đã biết.</span>
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
