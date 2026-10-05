import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import type { FlowFile } from '../../types/flow.types'

interface FileListProps {
  files: FlowFile[]
  disabled: boolean
  onRemove: (id: string) => void
  /** Bỏ trống = thứ tự tệp không ảnh hưởng kết quả, không vẽ nút dời. */
  onMove?: (id: string, delta: -1 | 1) => void
  onClear: () => void
}

/** Tệp đã chọn: tên, dung lượng, dời lên / xuống, bỏ. */
export function FileList({ files, disabled, onRemove, onMove, onClear }: FileListProps) {
  return (
    <section className="erp-flow-files" aria-label="Tệp đã chọn">
      <header className="erp-flow-files__head">
        <h2 className="erp-flow-files__title">
          Tệp đã chọn <span className="erp-flow-files__count">({files.length})</span>
        </h2>
        {files.length > 1 ? (
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
            Bỏ tất cả
          </button>
        ) : null}
      </header>

      <ol className="erp-flow-files__list">
        {files.map((file, index) => (
          <li key={file.id} className="erp-flow-file">
            {onMove && files.length > 1 ? <span className="erp-flow-file__order">{index + 1}</span> : null}
            <span className="erp-flow-file__thumb">
              {file.thumbnail ? <img src={file.thumbnail} alt="" /> : <Icon name={file.icon} />}
            </span>
            <span className="erp-flow-file__text">
              <span className="erp-flow-file__name" title={file.name}>
                {file.name}
              </span>
              <span className="erp-flow-file__meta">
                {formatFileSize(file.size)}
                {file.detail ? ` · ${file.detail}` : ''}
              </span>
            </span>
            <span className="erp-flow-file__actions">
              {onMove && files.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="btn erp-flow-file__button"
                    aria-label={`Đưa ${file.name} lên trên`}
                    title="Đưa lên"
                    disabled={disabled || index === 0}
                    onClick={() => onMove(file.id, -1)}
                  >
                    <Icon name="arrow-up" />
                  </button>
                  <button
                    type="button"
                    className="btn erp-flow-file__button"
                    aria-label={`Đưa ${file.name} xuống dưới`}
                    title="Đưa xuống"
                    disabled={disabled || index === files.length - 1}
                    onClick={() => onMove(file.id, 1)}
                  >
                    <Icon name="arrow-down" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="btn erp-flow-file__button"
                aria-label={`Bỏ ${file.name}`}
                title="Bỏ tệp này"
                disabled={disabled}
                onClick={() => onRemove(file.id)}
              >
                <Icon name="x-lg" />
              </button>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
