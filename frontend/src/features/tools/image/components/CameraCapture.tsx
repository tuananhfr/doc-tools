import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { Icon, useToast } from '@/components/ui'
import { TOOL_LIMITS } from '@/features/tools/hub'
import { newId } from '@/utils/id'
import { useCamera } from '../hooks/useCamera'
import { renderCrop } from '../services/crop-render'
import type { Rect } from '../types/image.types'
import { NEUTRAL_ADJUST } from '../utils/adjust'
import { fullRect, isFullRect } from '../utils/crop-rect'
import { CropBox } from './CropBox'

interface CameraCaptureProps {
  show: boolean
  onClose: () => void
  /** Ảnh đã chụp (và đã cắt nếu có), theo đúng thứ tự chụp. */
  onDone: (files: File[]) => void
}

interface Shot {
  id: string
  blob: Blob
  url: string
  width: number
  height: number
  /** Khung cắt tay; null = giữ cả ảnh. */
  rect: Rect | null
}

/** Mỗi ảnh ~1–2 MB nằm trong RAM cho tới khi bấm "Dùng" — 50 trang là đủ cho một bộ hồ sơ. */
const MAX_SHOTS = TOOL_LIMITS.cameraShots

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Chụp nhiều ảnh liên tiếp bằng camera của máy rồi trả về như các tệp JPG.
 * Bấm vào ảnh thu nhỏ để cắt tay hoặc bỏ ảnh đó. Camera chỉ bật trong lúc cửa
 * sổ này mở.
 */
export function CameraCapture({ show, onClose, onDone }: CameraCaptureProps) {
  return (
    <Modal show={show} onHide={onClose} size="lg" fullscreen="sm-down" centered backdrop="static" keyboard={false} className="erp-camera" aria-labelledby="erp-camera-title">
      <CameraSession onClose={onClose} onDone={onDone} />
    </Modal>
  )
}

function CameraSession({ onClose, onDone }: Omit<CameraCaptureProps, 'show'>) {
  const toast = useToast()
  const { video, state: cameraState, canRetry, torch, toggleTorch, retry, capture } = useCamera()
  const [shots, setShots] = useState<Shot[]>([])
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [busy, setBusy] = useState<'shooting' | 'finishing' | null>(null)

  const latest = useRef<Shot[]>([])
  useEffect(() => {
    latest.current = shots
  }, [shots])
  useEffect(() => () => latest.current.forEach((shot) => URL.revokeObjectURL(shot.url)), [])

  const review = shots.find((shot) => shot.id === reviewing) ?? null
  const live = cameraState.phase === 'live'
  const full = shots.length >= MAX_SHOTS

  const shoot = async () => {
    setBusy('shooting')
    try {
      const { blob, width, height } = await capture()
      setShots((current) => [...current, { id: newId(), blob, url: URL.createObjectURL(blob), width, height, rect: null }])
    } catch {
      toast.error('Không chụp được. Thử lại.')
    } finally {
      setBusy(null)
    }
  }

  const discard = (shot: Shot) => {
    URL.revokeObjectURL(shot.url)
    setShots((current) => current.filter((other) => other.id !== shot.id))
    setReviewing(null)
  }

  const setRect = (shot: Shot, rect: Rect | null) => setShots((current) => current.map((other) => (other.id === shot.id ? { ...other, rect } : other)))

  const finish = async () => {
    setBusy('finishing')
    try {
      const now = new Date()
      const stamp = `${pad(now.getHours())}h${pad(now.getMinutes())}`
      const files: File[] = []
      for (const [index, shot] of shots.entries()) {
        const cropped = shot.rect && !isFullRect(shot.rect, shot)
        const blob = cropped && shot.rect ? (await renderCrop(shot.blob, { ...NEUTRAL_ADJUST, rotation: 0, rect: shot.rect }, 'jpeg')).blob : shot.blob
        files.push(new File([blob], `Ảnh chụp ${stamp} - ${pad(index + 1)}.jpg`, { type: 'image/jpeg' }))
      }
      onDone(files)
      onClose()
    } catch {
      toast.error('Không dựng được ảnh đã cắt. Bỏ khung cắt rồi thử lại.')
      setBusy(null)
    }
  }

  return (
    <>
      <Modal.Header>
        <Modal.Title as="h2" className="fs-5" id="erp-camera-title">
          <Icon name="camera" className="me-2" />
          {review ? `Cắt ảnh ${shots.indexOf(review) + 1}/${shots.length}` : 'Chụp ảnh'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="erp-camera__body">
        <div className="erp-camera__view">
          {/* Giữ <video> trong cây cả lúc đang cắt ảnh: gỡ ra là luồng camera mất chỗ phát, quay lại chụp phải xin lại. */}
          <video ref={video} className="erp-camera__video" hidden={review !== null || !live} playsInline muted autoPlay aria-label="Khung ngắm camera" />

          {review ? (
            <div className="erp-image-stage__frame" style={{ '--erp-image-ratio': review.width / review.height } as CSSProperties}>
              <img className="erp-camera__shot" src={review.url} alt={`Ảnh chụp ${shots.indexOf(review) + 1}`} draggable={false} />
              <CropBox bounds={review} rect={review.rect ?? fullRect(review)} aspect={null} disabled={busy !== null} onChange={(rect) => setRect(review, rect)} />
            </div>
          ) : null}

          {!review && cameraState.phase === 'starting' ? (
            <p className="erp-camera__status" role="status">
              <Spinner as="span" size="sm" />
              Đang mở camera… Trình duyệt có thể hỏi quyền dùng camera.
            </p>
          ) : null}

          {!review && cameraState.phase === 'error' ? (
            <div className="erp-camera__status" role="alert">
              <Icon name="camera-video-off" className="erp-camera__status-icon" />
              <p className="mb-0">{cameraState.message}</p>
              {canRetry ? (
                <Button variant="outline-secondary" size="sm" onClick={retry}>
                  <Icon name="arrow-clockwise" className="me-2" />
                  Thử lại
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {review ? (
          <div className="erp-camera__controls erp-camera__controls--review">
            <Button variant="outline-secondary" disabled={busy !== null} onClick={() => setReviewing(null)}>
              <Icon name="arrow-left" className="me-2" />
              Chụp tiếp
            </Button>
            <Button variant="outline-secondary" disabled={busy !== null || !review.rect || isFullRect(review.rect, review)} onClick={() => setRect(review, null)}>
              <Icon name="arrows-fullscreen" className="me-2" />
              Bỏ khung cắt
            </Button>
            <Button variant="outline-danger" disabled={busy !== null} onClick={() => discard(review)}>
              <Icon name="trash3" className="me-2" />
              Xoá ảnh này
            </Button>
          </div>
        ) : (
          <div className="erp-camera__controls">
            <ol className="erp-camera__strip" aria-label="Ảnh đã chụp">
              {shots.map((shot, index) => (
                <li key={shot.id}>
                  <button type="button" className="erp-camera__thumb" aria-label={`Xem và cắt ảnh ${index + 1}`} title="Xem, cắt hoặc xoá ảnh này" onClick={() => setReviewing(shot.id)}>
                    <img src={shot.url} alt="" />
                    <span className="erp-camera__thumb-order">{index + 1}</span>
                  </button>
                </li>
              ))}
            </ol>

            <button type="button" className="erp-camera__shutter" aria-label="Chụp" title={full ? `Đã đủ ${MAX_SHOTS} ảnh` : 'Chụp'} disabled={!live || busy !== null || full} onClick={() => void shoot()}>
              <span className="erp-camera__shutter-core" />
            </button>

            <div className="erp-camera__side">
              {torch !== null ? (
                <button
                  type="button"
                  className={`btn erp-camera__torch${torch ? ' is-on' : ''}`}
                  aria-label="Đèn"
                  aria-pressed={torch}
                  title={torch ? 'Tắt đèn' : 'Bật đèn'}
                  disabled={!live}
                  onClick={() => void toggleTorch()}
                >
                  <Icon name={torch ? 'lightning-charge-fill' : 'lightning-charge'} />
                </button>
              ) : null}
            </div>
          </div>
        )}

        <p className="erp-camera__count" role="status">
          {review
            ? 'Kéo khung để giữ lại phần cần lấy. Không kéo gì thì giữ cả ảnh.'
            : shots.length === 0
              ? 'Chưa chụp ảnh nào.'
              : full
                ? `Đã đủ ${MAX_SHOTS} ảnh cho một lượt.`
                : `Đã chụp ${shots.length} ảnh. Bấm vào ảnh thu nhỏ để cắt hoặc xoá.`}
        </p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" disabled={busy === 'finishing'} onClick={onClose}>
          {shots.length > 0 ? `Bỏ ${shots.length} ảnh và đóng` : 'Đóng'}
        </Button>
        <Button variant="primary" disabled={shots.length === 0 || busy !== null} onClick={() => void finish()}>
          {busy === 'finishing' ? <Spinner as="span" size="sm" className="me-2" /> : <Icon name="check2" className="me-2" />}
          {shots.length > 0 ? `Dùng ${shots.length} ảnh` : 'Dùng ảnh'}
        </Button>
      </Modal.Footer>
    </>
  )
}
