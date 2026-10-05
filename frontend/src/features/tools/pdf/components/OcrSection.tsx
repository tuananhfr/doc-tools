import { Button, ProgressBar } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { OcrState } from '../hooks/useOcr'

interface OcrSectionProps {
  state: OcrState | null
  /** Số trang đang chọn — có chọn thì chỉ nhận dạng trong đó. */
  selectedCount: number
  disabled: boolean
  onRun: () => void
  onCancel: () => void
}

function statusText(state: OcrState): string {
  if (state.total === 0) return 'Đang kiểm tra trang nào chưa có lớp chữ…'
  if (state.stage === 'loading') return `Đang tải bộ nhận dạng tiếng Việt (~5 MB, chỉ lần đầu) — trang ${state.done + 1}/${state.total}…`
  return `Đang nhận dạng trang ${state.done + 1}/${state.total}…`
}

/** OCR cho trang ảnh / bản scan ở tab Tìm — kết quả thành lớp chữ cho tìm, tô, sửa và tệp xuất. */
export function OcrSection({ state, selectedCount, disabled, onRun, onCancel }: OcrSectionProps) {
  const scope = selectedCount > 0 ? `${selectedCount} trang đã chọn` : 'mọi trang'

  return (
    <section className="erp-doc-ocr" aria-label="Nhận dạng chữ">
      <p className="erp-doc-ocr__intro">
        <Icon name="file-earmark-text" className="me-1" />
        Trang ảnh, bản scan chưa có lớp chữ: nhận dạng ngay trên máy (tệp không gửi đi) để tìm, tô, sửa chữ và xuất PDF tìm được.
      </p>
      {state ? (
        <div className="erp-doc-ocr__running" role="status">
          <span className="erp-doc-ocr__status">{statusText(state)}</span>
          <ProgressBar
            now={state.total === 0 ? 0 : ((state.done + (state.stage === 'reading' ? state.progress : 0)) / state.total) * 100}
            aria-label="Tiến độ nhận dạng"
            className="erp-doc-ocr__bar"
          />
          <Button variant="outline-secondary" onClick={onCancel}>
            <Icon name="stop-circle" className="me-2" />
            Dừng
          </Button>
        </div>
      ) : (
        <Button variant="outline-secondary" className="w-100" disabled={disabled} onClick={onRun}>
          <Icon name="magic" className="me-2" />
          Nhận dạng chữ (OCR) — {scope}
        </Button>
      )}
    </section>
  )
}
