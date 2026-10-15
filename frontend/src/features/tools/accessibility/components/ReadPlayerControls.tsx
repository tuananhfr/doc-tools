import type { ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'

interface ReadPlayerControlsProps {
  speaking: boolean
  paused: boolean
  busy: boolean
  canRead: boolean
  /** Đầu câu trước / sau; `null` = không có (nút tắt). */
  previous: number | null
  next: number | null
  /** Vị trí đã nhớ của văn bản đang chọn; `null` = không hiện nút đọc tiếp. */
  resumeOffset: number | null
  onRead: () => void
  onResumeSaved: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onJump: (offset: number) => void
  extra?: ReactNode
}

/** Nút điều khiển; mọi nút đều là thao tác bấm thật vì iOS chỉ cho phát tiếng trong thao tác của người dùng. */
export function ReadPlayerControls({ speaking, paused, busy, canRead, previous, next, resumeOffset, onRead, onResumeSaved, onPause, onResume, onStop, onJump, extra }: ReadPlayerControlsProps) {
  const { t } = useTranslation('accessibility')
  return (
    <div className="erp-read-player mt-3">
      <div className="erp-read-player__row">
        {speaking ? <Button onClick={onPause}><Icon name="pause-fill" className="me-2" />{t('readAloud.pause')}</Button>
          : paused ? <Button onClick={onResume}><Icon name="play-fill" className="me-2" />{t('readAloud.resume')}</Button>
            : <Button disabled={!canRead} onClick={onRead}><Icon name="play-fill" className="me-2" />{t('readAloud.read')}</Button>}
        <Button variant="outline-secondary" disabled={!busy} onClick={onStop}><Icon name="stop-fill" className="me-2" />{t('shared.stop')}</Button>
      </div>
      <div className="erp-read-player__row">
        <Button variant="outline-secondary" disabled={previous === null} onClick={() => { if (previous !== null) onJump(previous) }}>
          <Icon name="skip-backward-fill" /> {t('readAloud.previous')}
        </Button>
        <Button variant="outline-secondary" disabled={next === null} onClick={() => { if (next !== null) onJump(next) }}>
          {t('readAloud.next')} <Icon name="skip-forward-fill" />
        </Button>
      </div>
      {resumeOffset !== null ? <Button variant="outline-primary" disabled={!canRead} onClick={onResumeSaved}>{t('readAloud.resumeSaved')}</Button> : null}
      {extra}
    </div>
  )
}
