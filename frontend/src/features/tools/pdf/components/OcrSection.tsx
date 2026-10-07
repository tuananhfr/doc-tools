import type { TFunction } from 'i18next'
import { Button, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
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

function statusText(state: OcrState, t: TFunction<'pdf'>): string {
  if (state.total === 0) return t('ocr.checking')
  if (state.stage === 'loading') return t('ocr.loading', { page: state.done + 1, total: state.total })
  return t('ocr.reading', { page: state.done + 1, total: state.total })
}

/** OCR cho trang ảnh / bản scan ở tab Tìm — kết quả thành lớp chữ cho tìm, tô, sửa và tệp xuất. */
export function OcrSection({ state, selectedCount, disabled, onRun, onCancel }: OcrSectionProps) {
  const { t } = useTranslation('pdf')

  return (
    <section className="erp-doc-ocr" aria-label={t('ocr.label')}>
      <p className="erp-doc-ocr__intro">
        <Icon name="file-earmark-text" className="me-1" />
        {t('ocr.intro')}
      </p>
      {state ? (
        <div className="erp-doc-ocr__running" role="status">
          <span className="erp-doc-ocr__status">{statusText(state, t)}</span>
          <ProgressBar
            now={state.total === 0 ? 0 : ((state.done + (state.stage === 'reading' ? state.progress : 0)) / state.total) * 100}
            aria-label={t('ocr.progress')}
            className="erp-doc-ocr__bar"
          />
          <Button variant="outline-secondary" onClick={onCancel}>
            <Icon name="stop-circle" className="me-2" />
            {t('ocr.stop')}
          </Button>
        </div>
      ) : (
        <Button variant="outline-secondary" className="w-100" disabled={disabled} onClick={onRun}>
          <Icon name="magic" className="me-2" />
          {selectedCount > 0 ? t('ocr.runSelected', { count: selectedCount }) : t('ocr.runAll')}
        </Button>
      )}
    </section>
  )
}
