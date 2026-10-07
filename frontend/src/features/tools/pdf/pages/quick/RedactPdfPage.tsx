import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolLeaveGuard } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { RedactStage } from '../../components/quick/RedactStage'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { redactTask } from '../../services/page-tasks'
import type { Rect } from '../../types/markup.types'

const ACCEPT: readonly QuickKind[] = ['pdf']

interface Marked {
  sourceId: string
  boxes: Record<string, Rect[]>
}

/** CHE THÔNG TIN PDF — khoanh vùng trên từng trang; nội dung dưới khung bị xoá hẳn khỏi tệp ra. */
export default function RedactPdfPage() {
  const { t } = useTranslation('pdf')
  const quick = useQuickSources({ accept: ACCEPT, multiple: false })
  const [marked, setMarked] = useState<Marked>({ sourceId: '', boxes: {} })

  const [item] = quick.items
  const sourceId = item?.source.id ?? ''
  // Khung che thuộc về tệp đang mở: đổi tệp là bỏ, không để khung của tệp cũ đè lên trang của tệp mới.
  const boxes = marked.sourceId === sourceId ? marked.boxes : {}
  const pages = item ? item.pages.filter((page) => (boxes[page.id]?.length ?? 0) > 0).length : 0

  const change = (pageId: string, next: Rect[]) => setMarked({ sourceId, boxes: { ...boxes, [pageId]: next } })

  return (
    <>
      {/* Khung che chỉ nằm trong RAM: rời màn là phải khoanh lại từ đầu. */}
      <ToolLeaveGuard active={pages > 0} />
      <QuickToolShell
        quick={quick}
        accept={ACCEPT}
        multiple={false}
        pickerTitle={t('redact.pickerTitle')}
        stage={(running) => (item ? <RedactStage key={sourceId} item={item} boxes={boxes} disabled={running} onChange={change} onClear={quick.clear} /> : null)}
        runLabel={pages > 0 ? t('redact.runMany', { count: pages }) : t('redact.run')}
        runIcon="eye-slash"
        blocked={pages === 0 ? t('redact.blocked') : null}
        task={() => redactTask(item, boxes)}
      />
    </>
  )
}
