import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { CameraCapture } from '@/features/tools/image'
import { ImageSheetFields } from '../../components/ImageSheetFields'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { imagesToPdfTask } from '../../services/quick-tasks'
import type { ImageSheet } from '../../types/doc-tools.types'
import { DEFAULT_SHEET } from '../../utils/image-sheet'

const ACCEPT: readonly QuickKind[] = ['image']

/** SCAN ẢNH → PDF — mỗi ảnh một trang, xếp thứ tự, chọn khổ giấy và lề. Ảnh lấy từ máy hoặc chụp bằng camera. */
export default function ImagesToPdfPage() {
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [sheet, setSheet] = useState<ImageSheet>(DEFAULT_SHEET)
  const [camera, setCamera] = useState(false)
  const count = quick.items.length

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle="Chọn ảnh cần gộp thành PDF"
      pickerExtra={(addFiles) => (
        <>
          <Button variant="outline-secondary" className="erp-flow-picker__pick" disabled={quick.loading !== null} onClick={() => setCamera(true)}>
            <Icon name="camera" className="me-2" />
            Chụp ảnh
          </Button>
          <CameraCapture show={camera} onClose={() => setCamera(false)} onDone={addFiles} />
        </>
      )}
      runLabel={count > 1 ? `Tạo PDF ${count} trang` : 'Tạo PDF'}
      runIcon="file-earmark-pdf"
      blocked={null}
      task={() => imagesToPdfTask(quick.items, sheet)}
      options={<ImageSheetFields sheet={sheet} disabled={false} onChange={setSheet} />}
    />
  )
}
