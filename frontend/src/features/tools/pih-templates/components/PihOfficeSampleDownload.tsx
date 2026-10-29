import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { usePihTemplatesEnabled } from '../hooks/usePihTemplatesEnabled'

interface Props {
  generate: () => Promise<File>
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Word/Excel (WordCraft/GridCraft) nạp một `index.html` tĩnh trong iframe, không có tham số
 * hay `postMessage` nào để nạp sẵn nội dung — nên không có đường tiêm nội dung đã xác minh mà
 * không sửa engine vendor. Lối an toàn: sinh một tệp mẫu MỚI mỗi lần (không phải bản dùng
 * chung), cho tải xuống, người dùng tự mở nó bằng nút "Mở tệp" sẵn có trong trình soạn thảo.
 */
export function PihOfficeSampleDownload({ generate }: Props) {
  const enabled = usePihTemplatesEnabled()
  const { t } = useTranslation('common', { keyPrefix: 'office.pihSample' })
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!enabled) return null

  const run = async () => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      downloadFile(await generate())
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cn-office-pihsample">
      <Button type="button" variant="outline-secondary" size="sm" disabled={busy} onClick={() => void run()}>
        <Icon name={busy ? 'hourglass-split' : 'download'} />{busy ? t('busy') : t('downloadLabel')}
      </Button>
      <p className="cn-office-limit">{t('hint')}</p>
      {failed ? <p role="alert">{t('failed')}</p> : null}
    </div>
  )
}
