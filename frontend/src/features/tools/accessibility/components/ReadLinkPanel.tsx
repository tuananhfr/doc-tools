import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { ReadSource } from '../types/read-listen.types'

export interface ReadLinkPanelProps {
  /** WP4-B: gọi với `{ kind: 'link', title, text, sourceUrl, warnings }` khi tải bài xong, `null` khi đổi link. */
  onSource: (source: ReadSource | null) => void
  onPasteInstead: () => void
}

/**
 * Thẻ "Link bài viết". Đọc từ link cần máy chủ tải trang hộ (chống SSRF, robots, paywall — WP4-B, chờ Legal), nên
 * thẻ đang ẩn (`READ_LINK_TAB_ENABLED = false`) và thân này chỉ là chỗ giữ: WP4-B thay thân, giữ nguyên props.
 */
export function ReadLinkPanel(props: ReadLinkPanelProps) {
  const { t } = useTranslation('accessibility')
  return (
    <div className="erp-read-notice" role="status">
      <p className="mb-1">{t('readAloud.linkSoon')}</p>
      <Button variant="outline-secondary" className="erp-read-notice__action" onClick={props.onPasteInstead}>{t('readAloud.pasteInstead')}</Button>
    </div>
  )
}
