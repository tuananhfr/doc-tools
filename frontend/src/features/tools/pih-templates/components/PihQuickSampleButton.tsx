import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { usePihTemplatesEnabled } from '../hooks/usePihTemplatesEnabled'

interface Props {
  /** Chỉ sinh/thêm tệp mẫu khi true (ngoài cờ máy chủ) — gọi khi danh sách tệp đang trống. */
  visible: boolean
  generate: () => Promise<File[]>
  onPick: (files: File[]) => void
}

/**
 * Nút "Dùng mẫu PI Holding" cho các công cụ PDF nhanh (ghép / tách / so sánh / chuyển đổi /
 * OCR) — gắn vào `pickerExtra` của `QuickToolShell`, không sửa `QuickToolShell` hay engine xử
 * lý tệp. Tự ẩn khi cờ `templates.piholding.enabled` tắt (mặc định), nên không đổi gì ở màn
 * hình gốc khi cờ tắt.
 */
export function PihQuickSampleButton({ visible, generate, onPick }: Props) {
  const enabled = usePihTemplatesEnabled()
  const { t } = useTranslation('pdf', { keyPrefix: 'pihSample' })
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!enabled || !visible) return null

  const run = async () => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      onPick(await generate())
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cn-pihsample">
      <Button type="button" variant="outline-primary" size="sm" disabled={busy} onClick={() => void run()}>
        <Icon name="stars" />{busy ? t('busy') : t('button')}
      </Button>
      {failed ? <p role="alert" className="erp-flow-field__hint">{t('failed')}</p> : null}
    </div>
  )
}
