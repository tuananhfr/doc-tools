import { useMemo } from 'react'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { Decorations } from '../../types/decorations.types'
import { formatStampDate, layoutImageStamp, resolveDecorations } from '../../utils/decorations'
import { baseName } from '../../utils/file-guard'
import { DecorationOverlay } from '../DecorationOverlay'
import { PageCanvas } from './PageCanvas'
import { StageHead } from './StageHead'

interface DecorationStageProps {
  item: QuickItem
  decorations: Decorations
  /** Ảnh dấu để xem trước — URL do trang công cụ cấp và tự thu hồi. */
  stampUrl?: string
  disabled: boolean
  onClear: () => void
}

const percent = (value: number, whole: number) => `${(value / whole) * 100}%`

/**
 * Xem trước số trang / dấu trên MỘT trang thật của tệp, vẽ bằng cùng hàm bố
 * cục với lúc xuất. Chọn trang đầu tiên NẰM TRONG phạm vi áp — xem trước trang
 * bìa khi đang "bỏ trang đầu" là thấy một trang trống trơn, tưởng công cụ hỏng.
 */
export function DecorationStage({ item, decorations, stampUrl, disabled, onClear }: DecorationStageProps) {
  const resolved = useMemo(
    () =>
      resolveDecorations(
        decorations,
        item.pages.map((page) => page.id),
      ),
    [decorations, item],
  )
  const scopes = [resolved.headerFooter?.pageIds, resolved.watermark?.pageIds, resolved.imageStamp?.pageIds]
  const index = Math.max(
    0,
    item.pages.findIndex((page) => scopes.some((ids) => ids?.has(page.id))),
  )
  const page = item.pages[index]
  const view = { decorations: resolved, meta: { fileName: baseName(item.source.name), date: formatStampDate(new Date()) }, total: item.pages.length }
  const stamp = resolved.imageStamp?.pageIds.has(page.id) ? resolved.imageStamp.value : null

  return (
    <section className="erp-page-stage" aria-label="Xem trước">
      <StageHead name={item.source.name} meta={`Xem trước trang ${index + 1}/${item.pages.length}`}>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
          Bỏ tệp
        </button>
      </StageHead>
      <PageCanvas
        source={item.source}
        page={page}
        overlay={(size) => {
          const rect = stamp ? layoutImageStamp(stamp, size) : null
          return (
            <>
              <DecorationOverlay size={size} pageId={page.id} index={index} view={view} />
              {rect && stamp && stampUrl ? (
                <img
                  src={stampUrl}
                  alt=""
                  className="erp-page-stage__stamp"
                  style={{
                    left: percent(rect.x, size.width),
                    top: percent(rect.y, size.height),
                    width: percent(rect.width, size.width),
                    height: percent(rect.height, size.height),
                    opacity: stamp.opacity,
                  }}
                />
              ) : null}
            </>
          )
        }}
      />
    </section>
  )
}
