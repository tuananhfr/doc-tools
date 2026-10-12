import { useEffect, useId, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { extractReadLink, ReadLinkError } from '../services/read-extract.api'
import type { ReadSource } from '../types/read-listen.types'
import { normalizeReadLink, readLinkHost, type ReadLinkFailure } from '../utils/read-link'
import { ReadErrorNotice } from './ReadErrorNotice'

export interface ReadLinkPanelProps {
  /** Gọi với `{ kind: 'link', title, text, sourceUrl, warnings }` khi tải bài xong, `null` khi đổi link. */
  onSource: (source: ReadSource | null) => void
  onPasteInstead: () => void
}

/** Hai lỗi chỉ nhánh link mới có, nằm ngoài 8 mã chung nên không đi qua `ReadErrorNotice`. */
const LINK_ONLY_KEY = {
  INVALID: 'readAloud.link.errors.INVALID',
  RATE_LIMITED: 'readAloud.link.errors.RATE_LIMITED',
} as const
type Failure = ReadLinkFailure | 'INVALID'

/**
 * Thẻ "Link bài viết": máy chủ tải trang HTTPS công khai hộ (chống SSRF, robots, paywall — backend WP4-B).
 * Đường dẫn giữ trong state của panel: trang chỉ ẩn thẻ chứ không unmount, nên đổi thẻ rồi quay lại vẫn còn.
 */
export function ReadLinkPanel({ onSource, onPasteInstead }: ReadLinkPanelProps) {
  const { t } = useTranslation('accessibility')
  const inputId = useId()
  const noteId = useId()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  const change = (next: string) => {
    setValue(next)
    setFailure(null)
    // Bài cũ không còn khớp ô nhập: bỏ khỏi trình đọc để không đọc nhầm nguồn.
    if (loadedFrom !== null) { setLoadedFrom(null); onSource(null) }
  }

  const submit = async () => {
    const url = normalizeReadLink(value)
    setLoadedFrom(null)
    onSource(null)
    if (!url) { setFailure('INVALID'); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setFailure('OFFLINE'); return }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setFailure(null)
    setBusy(true)
    try {
      const source = await extractReadLink(url, controller.signal)
      if (controller.signal.aborted) return
      setLoadedFrom((source.sourceUrl ? readLinkHost(source.sourceUrl) : null) ?? '')
      onSource(source)
    } catch (error) {
      if (controller.signal.aborted) return
      setFailure(error instanceof ReadLinkError ? error.code : 'UNSUPPORTED')
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false) }
    }
  }

  // noValidate: kiểm tra `type="url"` của trình duyệt chặn im lặng link thiếu "https://" — chính trường hợp
  // normalizeReadLink sinh ra để nhận; lỗi thật đã có thông báo INVALID riêng.
  return <form className="mt-3" noValidate onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <label className="erp-flow-field__label" htmlFor={inputId}>{t('readAloud.link.label')}</label>
    <Form.Control id={inputId} type="url" inputMode="url" autoComplete="url" spellCheck={false} placeholder={t('readAloud.link.placeholder')}
      value={value} aria-describedby={noteId} aria-invalid={failure === 'INVALID' || undefined} disabled={busy}
      onChange={(event) => change(event.target.value)} />
    <p id={noteId} className="erp-tool-result__note mt-1">{t('readAloud.link.privacy')}</p>
    <div className="d-flex flex-wrap gap-2 mt-2">
      <Button type="submit" disabled={busy || !value.trim()}>{busy ? t('readAloud.link.fetching') : t('readAloud.link.fetch')}</Button>
    </div>
    {loadedFrom !== null ? <p role="status" className="erp-tool-result__note mt-2">{t('readAloud.link.loaded', { host: loadedFrom })}</p> : null}
    {failure === 'INVALID' || failure === 'RATE_LIMITED'
      ? <div className="erp-read-notice" role="alert" data-code={failure}>
        <p className="mb-1"><strong>{t(LINK_ONLY_KEY[failure])}</strong></p>
        <Button variant="outline-secondary" className="erp-read-notice__action" onClick={onPasteInstead}>{t('readAloud.pasteInstead')}</Button>
      </div>
      : failure ? <ReadErrorNotice code={failure} onPasteInstead={onPasteInstead} tone="alert" /> : null}
  </form>
}
