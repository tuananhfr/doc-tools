import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { OfflineAssetsButton } from '@/features/tools/hub'
import { numberFormat } from '@/i18n/intl'
import { withBase } from '@/utils/url'
import { PIPER_DOWNLOAD_BYTES } from '../services/piper-tts'
import type { PiperErrorCode } from '../types/piper-tts.types'
import type { ReadEngine } from '../types/read-listen.types'
import type { ReadNotices } from '../utils/voice-select'
import { ReadErrorNotice } from './ReadErrorNotice'

const PIPER_ERROR_KEY = {
  MODEL_LOAD: 'readAloud.piperModelFailed',
  PROCESSING_FAILED: 'readAloud.piperFailed',
  UNSUPPORTED: 'readAloud.piperUnsupported',
  TIMEOUT: 'readAloud.piperTimeout',
} as const satisfies Record<PiperErrorCode, string>

interface ReadVoicePanelProps {
  engine: ReadEngine
  notices: ReadNotices
  /** Tên ngôn ngữ của NỘI DUNG, theo ngôn ngữ trang ("Tiếng Việt" / "Vietnamese"). */
  language: string
  vietnamese: boolean
  voiceName: string | null
  deviceFailed: boolean
  piperError: PiperErrorCode | null
  exported: boolean
  canUsePiper: boolean
  onUsePiper: () => void
  onPasteInstead?: () => void
}

/** Câu báo về giọng đang dùng: thiếu giọng, giọng online, mất mạng, lỗi Piper, giấy phép. Văn bản không bao giờ bị khoá vì giọng. */
export function ReadVoicePanel({ engine, notices, language, vietnamese, voiceName, deviceFailed, piperError, exported, canUsePiper, onUsePiper, onPasteInstead }: ReadVoicePanelProps) {
  const { t } = useTranslation('accessibility')
  return <>
    {notices.codes.map((code) => <ReadErrorNotice key={code} code={code} values={{ language }} onPasteInstead={onPasteInstead} />)}
    {notices.suggestPiper ? <Button variant="outline-primary" className="erp-read-notice__action mt-2" onClick={onUsePiper}>{t('readAloud.usePiper')}</Button> : null}
    {engine === 'device' ? <>
      {voiceName ? <p className="erp-tool-result__note mt-3">{t('readAloud.voiceUsing', { voice: voiceName })}</p> : null}
      {notices.onlineVoice ? <p className="erp-tool-result__note mt-2">{t('readAloud.voiceOnline', { voice: notices.onlineVoice })}</p> : null}
      {deviceFailed ? <p role="alert" className="erp-tool-result__note mt-3"><strong>{t('readAloud.deviceFailed')}</strong></p> : null}
      <p className="erp-tool-result__note mt-3">{t('readAloud.voiceNote')}</p>
    </> : <>
      {piperError ? <p role="alert" className="erp-tool-result__note mt-3"><strong>{t(PIPER_ERROR_KEY[piperError])}</strong></p> : null}
      {exported ? <p role="status" className="erp-tool-result__note mt-3">{t('readAloud.exportDone')}</p> : null}
      {canUsePiper ? <p className="erp-tool-result__note mt-3">{t('readAloud.piperNote', { size: numberFormat().format(Math.round(PIPER_DOWNLOAD_BYTES / 1e6)) })}</p> : null}
      {!vietnamese ? <p className="erp-tool-result__note mt-2">{t('readAloud.piperVietnameseOnly')}</p> : null}
      {canUsePiper ? <OfflineAssetsButton group="tts" bytes={PIPER_DOWNLOAD_BYTES} /> : null}
      <p className="erp-tool-result__note mt-2">{t('readAloud.credit')} <a href={withBase('/vendor/tts/NOTICE.txt')} target="_blank" rel="noopener noreferrer">{t('readAloud.license')}</a></p>
    </>}
  </>
}
