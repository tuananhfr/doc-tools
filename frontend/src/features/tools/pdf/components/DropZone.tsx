import { useId, useState, type DragEvent } from 'react'
import { Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { LoadingProgress } from '../hooks/useDocWorkspace'
import { megabytes, TOOL_LIMITS } from '@/features/tools/hub'
import { ACCEPT } from '../utils/pick-files'

interface DropZoneProps {
  loading: LoadingProgress | null
  onFiles: (files: File[]) => void
}

const CAPABILITIES = [
  { icon: 'files', label: 'Ghép nhiều PDF' },
  { icon: 'scissors', label: 'Tách, trích trang' },
  { icon: 'grid-3x3-gap', label: 'Sắp xếp, xoay, xoá trang' },
  { icon: 'images', label: 'Ảnh → PDF' },
  { icon: 'file-earmark-image', label: 'PDF → ảnh' },
]

/** Màn đầu khi phiên còn trống: một vùng thả duy nhất (spec 10 — "một drop zone"). */
export function DropZone({ loading, onFiles }: DropZoneProps) {
  const inputId = useId()
  const [over, setOver] = useState(false)

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setOver(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <section
      className={`erp-doc-drop${over ? ' is-over' : ''}`}
      aria-label="Thêm tệp"
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={handleDrop}
    >
      <span className="erp-doc-drop__icon">
        <Icon name="file-earmark-arrow-up" />
      </span>

      {loading ? (
        <p className="erp-doc-drop__title" role="status">
          <Spinner as="span" size="sm" className="me-2" />
          Đang đọc tệp {Math.min(loading.done + 1, loading.total)}/{loading.total}…
        </p>
      ) : (
        <>
          <h2 className="erp-doc-drop__title">Thả tệp PDF hoặc ảnh vào đây</h2>
          <p className="erp-doc-drop__hint">
            PDF, JPG, PNG · tối đa {megabytes(TOOL_LIMITS.fileBytes)} mỗi tệp, {TOOL_LIMITS.totalPages} trang mỗi phiên
          </p>
          <label htmlFor={inputId} className="btn btn-primary erp-doc-drop__pick">
            <Icon name="folder2-open" className="me-2" />
            Chọn tệp
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            className="visually-hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              if (files.length > 0) onFiles(files)
            }}
          />
        </>
      )}

      <ul className="erp-doc-drop__caps">
        {CAPABILITIES.map((item) => (
          <li key={item.label}>
            <Icon name={item.icon} className="me-1" />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
