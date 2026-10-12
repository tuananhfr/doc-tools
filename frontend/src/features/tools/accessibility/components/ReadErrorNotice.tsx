import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { ReadErrorCode } from '../types/read-listen.types'

const ERROR_KEY = {
  PAYWALL: 'readAloud.errors.PAYWALL',
  ROBOTS_DENIED: 'readAloud.errors.ROBOTS_DENIED',
  UNSUPPORTED: 'readAloud.errors.UNSUPPORTED',
  NO_ARTICLE: 'readAloud.errors.NO_ARTICLE',
  TTS_UNAVAILABLE: 'readAloud.errors.TTS_UNAVAILABLE',
  OCR_UNCERTAIN: 'readAloud.errors.OCR_UNCERTAIN',
  OFFLINE: 'readAloud.errors.OFFLINE',
  TOO_LARGE: 'readAloud.errors.TOO_LARGE',
} as const satisfies Record<ReadErrorCode, string>

interface ReadErrorNoticeProps {
  code: ReadErrorCode
  /** Biến của câu báo (`language` cho TTS_UNAVAILABLE). */
  values?: Record<string, string>
  /** Lý do chi tiết từ bước nạp tệp (vd. "Tệp có mật khẩu"). */
  detail?: string
  /** Spec v3 §06: mọi lỗi kèm đường lui "dán văn bản"; bỏ trống khi người dùng đã ở thẻ Dán chữ. */
  onPasteInstead?: () => void
  tone?: 'alert' | 'status'
}

/** Một câu báo theo mã lỗi của Đọc & Nghe; `data-code` để hỗ trợ và script kiểm bám vào khi câu chữ đổi. */
export function ReadErrorNotice({ code, values, detail, onPasteInstead, tone = 'status' }: ReadErrorNoticeProps) {
  const { t } = useTranslation('accessibility')
  return (
    <div className="erp-read-notice" role={tone} data-code={code}>
      <p className="mb-1"><strong>{t(ERROR_KEY[code], values)}</strong></p>
      {detail ? <p className="mb-1">{detail}</p> : null}
      {onPasteInstead ? <Button variant="outline-secondary" className="erp-read-notice__action" onClick={onPasteInstead}>{t('readAloud.pasteInstead')}</Button> : null}
    </div>
  )
}
