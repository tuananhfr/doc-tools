import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Spinner } from 'react-bootstrap'
import { ConfirmAction, Icon } from '@/components/ui'
import type { InsertPosition } from '../types/doc-tools.types'
import type { LoadingProgress } from '../hooks/useDocWorkspace'
import type { CollageSize } from '../utils/image-sheet'

interface DocToolbarProps {
  pageCount: number
  selectedCount: number
  /** Số trang đang chọn gộp được. */
  combinable: number
  canUndo: boolean
  canRedo: boolean
  loading: LoadingProgress | null
  onAddFiles: () => void
  onInsert: (position: InsertPosition) => void
  onReplace: () => void
  onRotate: (delta: 90 | -90) => void
  onDuplicate: () => void
  onCombine: (size: CollageSize) => void
  onCleanScan: () => void
  onRemove: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
}

interface ToolButtonProps {
  icon: string
  label: string
  hint?: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

function ToolButton({ icon, label, hint, disabled, danger, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`erp-doc-tool${danger ? ' erp-doc-tool--danger' : ''}`}
      disabled={disabled}
      title={hint ?? label}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span className="erp-doc-tool__label">{label}</span>
    </button>
  )
}

function ToolGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="erp-doc-toolbar__group" role="group" aria-label={label}>
      {children}
    </div>
  )
}

/**
 * Thanh thao tác theo vùng chọn (spec 10 — "toolbar theo ngữ cảnh"): nút cần
 * đúng MỘT trang làm mốc (chèn/thay) chỉ bật khi chọn một trang.
 */
export function DocToolbar({
  pageCount,
  selectedCount,
  combinable,
  canUndo,
  canRedo,
  loading,
  onAddFiles,
  onInsert,
  onReplace,
  onRotate,
  onDuplicate,
  onCombine,
  onCleanScan,
  onRemove,
  onSelectAll,
  onClearSelection,
  onUndo,
  onRedo,
  onReset,
}: DocToolbarProps) {
  const root = useRef<HTMLDivElement>(null)
  const none = selectedCount === 0
  const notSingle = selectedCount !== 1
  const needOne = 'Chọn đúng một trang làm mốc'
  const cannotCombine = combinable < 2
  const needImages = 'Chọn từ hai trang ảnh trở lên (ảnh chưa đánh dấu)'

  // Thanh công cụ xuống 1–3 dòng tuỳ bề ngang; bảng xuất dính ngay dưới nó
  // phải biết chiều cao THẬT, đoán số cố định là bị che mất phần đầu.
  useLayoutEffect(() => {
    const element = root.current
    const page = element?.closest<HTMLElement>('.erp-doc-tools')
    if (!element || !page) return
    const observer = new ResizeObserver(() => {
      page.style.setProperty('--erp-doc-toolbar-h', `${element.offsetHeight}px`)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root} className="erp-doc-toolbar" role="toolbar" aria-label="Thao tác trang">
      <ToolGroup label="Tệp">
        <ToolButton icon="plus-lg" label="Thêm tệp" hint="Thêm tệp vào cuối tài liệu" disabled={!!loading} onClick={onAddFiles} />
        <ToolButton icon="box-arrow-in-left" label="Chèn trước" hint={notSingle ? needOne : 'Chèn tệp trước trang đang chọn'} disabled={notSingle || !!loading} onClick={() => onInsert('before')} />
        <ToolButton icon="box-arrow-in-right" label="Chèn sau" hint={notSingle ? needOne : 'Chèn tệp sau trang đang chọn'} disabled={notSingle || !!loading} onClick={() => onInsert('after')} />
        <ToolButton icon="arrow-left-right" label="Thay trang" hint={notSingle ? needOne : 'Thay trang đang chọn bằng trang của tệp khác'} disabled={notSingle || !!loading} onClick={onReplace} />
      </ToolGroup>

      <ToolGroup label="Trang đã chọn">
        <ToolButton icon="arrow-counterclockwise" label="Xoay trái" disabled={none} onClick={() => onRotate(-90)} />
        <ToolButton icon="arrow-clockwise" label="Xoay phải" disabled={none} onClick={() => onRotate(90)} />
        <ToolButton icon="copy" label="Nhân bản" disabled={none} onClick={onDuplicate} />
        <ToolButton icon="layout-split" label="Gộp 2 ảnh" hint={cannotCombine ? needImages : 'Đặt các ảnh đang chọn lên chung trang, 2 ảnh một trang'} disabled={cannotCombine} onClick={() => onCombine(2)} />
        <ToolButton icon="grid" label="Gộp 4 ảnh" hint={cannotCombine ? needImages : 'Đặt các ảnh đang chọn lên chung trang, 4 ảnh một trang'} disabled={cannotCombine} onClick={() => onCombine(4)} />
        <ToolButton
          icon="magic"
          label="Dọn scan"
          hint={`Tìm trang trắng, trang nghiêng, viền tối — ${none ? 'cả tài liệu' : 'trong các trang đang chọn'}`}
          disabled={!!loading}
          onClick={onCleanScan}
        />
        <ToolButton icon="trash3" label="Xoá" danger disabled={none} onClick={onRemove} />
      </ToolGroup>

      <ToolGroup label="Lịch sử">
        <ToolButton icon="arrow-90deg-left" label="Hoàn tác" hint="Hoàn tác (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} />
        <ToolButton icon="arrow-90deg-right" label="Làm lại" hint="Làm lại (Ctrl+Y)" disabled={!canRedo} onClick={onRedo} />
      </ToolGroup>

      <div className="erp-doc-toolbar__status" aria-live="polite">
        {loading ? (
          <span>
            <Spinner size="sm" className="me-2" />
            Đang đọc tệp {Math.min(loading.done + 1, loading.total)}/{loading.total}…
          </span>
        ) : (
          <span className="erp-doc-toolbar__count">
            Đã chọn <strong>{selectedCount}</strong>/{pageCount} trang
          </span>
        )}
        <button type="button" className="btn btn-link btn-sm" onClick={none ? onSelectAll : onClearSelection}>
          {none ? 'Chọn tất cả' : 'Bỏ chọn'}
        </button>
        <ConfirmAction
          title="Làm lại từ đầu?"
          description="Mọi trang và tệp đang mở sẽ bị gỡ khỏi phiên này. Tệp gốc trên máy bạn không bị ảnh hưởng."
          confirmLabel="Gỡ hết"
          danger
          onConfirm={onReset}
        >
          {({ onClick }) => (
            <button type="button" className="btn btn-link btn-sm erp-doc-toolbar__reset" title="Làm lại từ đầu" onClick={onClick}>
              <Icon name="x-circle" />
              <span className="erp-doc-toolbar__reset-label">Làm lại từ đầu</span>
            </button>
          )}
        </ConfirmAction>
      </div>
    </div>
  )
}
