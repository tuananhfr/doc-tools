import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon, useToast } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { megabytes, TOOL_LIMITS } from '../../config/limits'
import type { FlowNote, FlowOutput, FlowResult as Result, FlowTone } from '../../types/flow.types'
import { copyText as copyToClipboard } from '../../utils/clipboard'
import { canPreview, canShare, downloadOutput, outputIcon, previewOutput, shareOutput } from '../../utils/flow-output'
import { recordQualityEvent } from '../../services/quality-events'
import { qualityToolForPath } from '../../services/quality-tool'

interface FlowResultProps {
  result: Result
  /** Về bước chọn tệp, giữ nguyên tệp đã chọn. */
  onRestart: () => void
  /** Mở tệp kết quả trong công cụ khác để làm tiếp; bỏ trống = không có nút. */
  onEdit?: (output: FlowOutput) => void
  onDownloaded?: () => void
  /** Chỗ cho công cụ gắn thêm (lời mời đăng nhập…), ngay dưới hàng nút. */
  extra?: ReactNode
}

const NOTE_ICON: Record<FlowTone, string> = {
  success: 'check-circle',
  info: 'info-circle',
  warning: 'exclamation-triangle',
}

const BADGE_ICON: Record<FlowTone, string> = {
  success: 'check-lg',
  info: 'info-lg',
  warning: 'exclamation-lg',
}

/** Bước 3: tệp đã xong — tải về, xem trước, chia sẻ, làm lại. */
export function FlowResult({ result, onRestart, onEdit, onDownloaded, extra }: FlowResultProps) {
  const toast = useToast()
  const { t } = useTranslation('common')
  const heading = useRef<HTMLHeadingElement>(null)
  const { output } = result
  const tone = result.tone ?? 'success'
  const textLabel = result.textLabel ?? t('result.textLabel')
  const previewable = canPreview(output.blob.type)
  const shareable = useMemo(() => canShare(output), [output])

  // Màn đổi hẳn nội dung mà không đổi trang: đưa focus lên tiêu đề để trình đọc màn hình đọc kết quả.
  useEffect(() => {
    heading.current?.focus()
  }, [])

  // Tệp ra có thể vượt chính trần đầu vào (ghép hai tệp 95 MB ra 192 MB): nói trước, đừng để
  // người dùng tải về rồi mới biết không nạp lại hay gửi thư được.
  const notes = useMemo<FlowNote[]>(() => {
    if (output.blob.size <= TOOL_LIMITS.outputWarnBytes) return result.notes
    const limit = megabytes(TOOL_LIMITS.outputWarnBytes)
    return [...result.notes, { tone: 'warning', text: t('result.tooLarge', { limit }) }]
  }, [output, result.notes, t])

  const copyText = async () => {
    if (!result.text) return
    // `copyToClipboard` có đường lui cho ngữ cảnh không an toàn (mở bằng http://<IP LAN>), nơi `navigator.clipboard` là undefined.
    if (await copyToClipboard(result.text)) toast.success(t('copy.done'))
    else toast.error(t('copy.blocked'))
  }

  const share = async () => {
    try {
      await shareOutput(output)
    } catch {
      toast.error(t('result.shareFailed'))
    }
  }

  return (
    <section className="erp-flow-result" aria-labelledby="erp-flow-result-title">
      <span className={`erp-flow-result__badge erp-flow-result__badge--${tone}`}>
        <Icon name={BADGE_ICON[tone]} />
      </span>
      <h2 id="erp-flow-result-title" ref={heading} tabIndex={-1} className="erp-flow-result__title">
        {result.title}
      </h2>

      <div className="erp-flow-result__file">
        <span className="erp-flow-result__file-icon">
          <Icon name={outputIcon(output.name)} />
        </span>
        <span className="erp-flow-result__file-text">
          <span className="erp-flow-result__file-name" title={output.name}>
            {output.name}
          </span>
          <span className="erp-flow-result__file-meta">
            {formatFileSize(output.blob.size)}
            {output.detail ? ` · ${output.detail}` : ''}
          </span>
        </span>
      </div>

      {result.text !== undefined ? (
        <div className="erp-flow-result__text">
          <div className="erp-flow-result__text-head">
            <span className="erp-flow-result__text-label">{textLabel}</span>
            <Button variant="outline-secondary" size="sm" onClick={() => void copyText()}>
              <Icon name="copy" className="me-2" />
              {t('copy.label')}
            </Button>
          </div>
          <textarea className="form-control erp-flow-result__text-body" readOnly rows={10} value={result.text} aria-label={textLabel} />
        </div>
      ) : null}

      <div className="erp-flow-result__actions">
        <Button
          variant="primary"
          className="erp-flow-result__download"
          onClick={() => {
            downloadOutput(output)
            recordQualityEvent('download', qualityToolForPath(window.location.pathname))
            onDownloaded?.()
          }}
        >
          <Icon name="download" className="me-2" />
          {t('result.download')}
        </Button>
        <div className="erp-flow-result__more">
          {previewable ? (
            <Button variant="outline-secondary" onClick={() => previewOutput(output)}>
              <Icon name="eye" className="me-2" />
              {t('result.preview')}
            </Button>
          ) : null}
          {shareable ? (
            <Button variant="outline-secondary" onClick={() => void share()}>
              <Icon name="share" className="me-2" />
              {t('result.share')}
            </Button>
          ) : null}
          {onEdit ? (
            <Button variant="outline-secondary" onClick={() => onEdit(output)}>
              <Icon name="pencil-square" className="me-2" />
              {t('result.edit')}
            </Button>
          ) : null}
          <Button variant="outline-secondary" onClick={onRestart}>
            <Icon name="arrow-counterclockwise" className="me-2" />
            {t('result.restart')}
          </Button>
        </div>
      </div>

      {extra}

      {notes.length > 0 ? (
        <ul className="erp-flow-result__notes">
          {notes.map((note) => (
            <li key={note.text} className={`erp-flow-note erp-flow-note--${note.tone}`}>
              <Icon name={NOTE_ICON[note.tone]} />
              <span>{note.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
