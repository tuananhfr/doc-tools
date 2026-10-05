import type { ReactNode } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { FlowRun } from '../../hooks/useFlowRun'
import type { FlowFile, FlowOutput, FlowRejected } from '../../types/flow.types'
import { FileList } from './FileList'
import { FilePicker, type PickerCopy } from './FilePicker'
import { FlowProgress } from './FlowProgress'
import { FlowResult } from './FlowResult'

interface ToolFlowProps {
  picker: PickerCopy
  files: FlowFile[]
  loading: { done: number; total: number } | null
  rejected: FlowRejected[]
  onDismissRejected: () => void
  onAddFiles: (files: File[]) => void
  onRemove: (id: string) => void
  onMove?: (id: string, delta: -1 | 1) => void
  onClear: () => void
  /** Đường vào khác ngoài chọn tệp (chụp ảnh…), đứng cạnh nút chọn tệp. */
  pickerExtra?: ReactNode
  /** Vùng làm việc riêng của công cụ (cắt ảnh, đo ảnh) — có thì thay cho danh sách tệp. */
  stage?: ReactNode
  /** Tuỳ chọn riêng của công cụ; bỏ trống = công cụ không có gì để chọn. */
  options?: ReactNode
  runLabel: string
  runIcon: string
  /** Vì sao chưa chạy được ("Cần ít nhất 2 tệp"); null = chạy được. */
  blocked: string | null
  run: FlowRun
  onRun: () => void
  onEdit?: (output: FlowOutput) => void
  onDownloaded?: () => void
  resultExtra?: ReactNode
}

/**
 * Khung luồng ba bước dùng chung cho các công cụ nhanh: chọn tệp → chạy → kết quả.
 * Chỉ vẽ; tệp do công cụ giữ, lượt chạy do `useFlowRun` giữ.
 */
export function ToolFlow({
  picker,
  files,
  loading,
  rejected,
  onDismissRejected,
  onAddFiles,
  onRemove,
  onMove,
  onClear,
  pickerExtra,
  stage,
  options,
  runLabel,
  runIcon,
  blocked,
  run,
  onRun,
  onEdit,
  onDownloaded,
  resultExtra,
}: ToolFlowProps) {
  const { state } = run

  if (state.phase === 'done') {
    return <FlowResult result={state.result} onRestart={run.reset} onEdit={onEdit} onDownloaded={onDownloaded} extra={resultExtra} />
  }

  const running = state.phase === 'running'

  return (
    <div className="erp-flow">
      <div className="erp-flow__main">
        <FilePicker {...picker} compact={files.length > 0} loading={loading} disabled={running} onFiles={onAddFiles} extra={pickerExtra} />

        {rejected.length > 0 ? (
          <div className="erp-flow-rejected" role="alert">
            <Icon name="exclamation-triangle" className="erp-flow-rejected__icon" />
            <div className="erp-flow-rejected__body">
              <p className="erp-flow-rejected__title">Bỏ qua {rejected.length} tệp</p>
              <ul className="erp-flow-rejected__list">
                {rejected.slice(0, 5).map((item, index) => (
                  <li key={`${item.name}-${index}`} data-code={item.code}>
                    <strong>{item.name}</strong> — {item.reason}
                  </li>
                ))}
                {rejected.length > 5 ? <li>… và {rejected.length - 5} tệp khác</li> : null}
              </ul>
            </div>
            <button type="button" className="btn erp-flow-rejected__close" aria-label="Ẩn thông báo" onClick={onDismissRejected}>
              <Icon name="x-lg" />
            </button>
          </div>
        ) : null}

        {stage ?? (files.length > 0 ? <FileList files={files} disabled={running} onRemove={onRemove} onMove={onMove} onClear={onClear} /> : null)}
      </div>

      <aside className="erp-flow__side" aria-label="Tuỳ chọn và chạy">
        {options ? (
          <fieldset className="erp-flow-options" disabled={running}>
            <legend className="erp-flow-options__title">Tuỳ chọn</legend>
            {options}
          </fieldset>
        ) : null}

        {state.phase === 'idle' && state.error ? (
          <p className="erp-flow-error" role="alert" data-code={state.error.code}>
            <Icon name="x-octagon" />
            <span>
              Không xử lý được: {state.error.message}
              <small className="erp-flow-error__code">Mã lỗi: {state.error.code}</small>
            </span>
          </p>
        ) : null}

        {running ? (
          <FlowProgress progress={state.progress} onCancel={run.cancel} />
        ) : (
          <>
            <Button variant="primary" className="erp-flow__run" disabled={blocked !== null || loading !== null} onClick={onRun}>
              <Icon name={runIcon} className="me-2" />
              {runLabel}
            </Button>
            {blocked ? <p className="erp-flow__hint">{blocked}</p> : null}
          </>
        )}
      </aside>
    </div>
  )
}
