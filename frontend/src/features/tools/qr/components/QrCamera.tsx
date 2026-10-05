import { Button, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolPanel } from '@/features/tools/hub'
import { useQrScanner } from '../hooks/useQrScanner'
import type { ScanRead } from '../services/qr-scan'

interface QrCameraProps {
  onRead: (read: ScanRead) => void
  onClose: () => void
}

/**
 * Ô ngắm camera. Chỉ được mount khi người dùng bấm "Quét bằng camera": mount là
 * xin quyền, unmount là tắt camera.
 */
export function QrCamera({ onRead, onClose }: QrCameraProps) {
  const { video, state, canRetry, retry } = useQrScanner(onRead)

  return (
    <ToolPanel
      title="Camera"
      actions={
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          <Icon name="camera-video-off" className="me-2" />
          Tắt camera
        </Button>
      }
    >
      <div className="erp-camera__view">
        <video ref={video} className="erp-camera__video" hidden={state.phase !== 'live'} playsInline muted aria-label="Khung ngắm camera" />

        {state.phase === 'starting' ? (
          <p className="erp-camera__status" role="status">
            <Spinner as="span" size="sm" />
            Đang mở camera… Trình duyệt có thể hỏi quyền dùng camera.
          </p>
        ) : null}

        {state.phase === 'error' ? (
          <div className="erp-camera__status" role="alert">
            <Icon name="camera-video-off" className="erp-camera__status-icon" />
            <p className="mb-0">{state.message}</p>
            {canRetry ? (
              <Button variant="outline-secondary" size="sm" onClick={retry}>
                <Icon name="arrow-clockwise" className="me-2" />
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {state.phase === 'live' ? <p className="erp-flow-field__hint mb-0">Đưa mã vào giữa khung hình, giữ yên một chút. Đọc được là kết quả hiện ngay, quét tiếp mã khác không cần bấm gì.</p> : null}
    </ToolPanel>
  )
}
