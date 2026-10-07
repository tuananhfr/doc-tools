import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Spinner } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('pdf')
  const root = useRef<HTMLDivElement>(null)
  const none = selectedCount === 0
  const notSingle = selectedCount !== 1
  const needOne = t('toolbar.needOne')
  const cannotCombine = combinable < 2
  const needImages = t('toolbar.needImages')

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
    <div ref={root} className="erp-doc-toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <ToolGroup label={t('toolbar.files')}>
        <ToolButton icon="plus-lg" label={t('toolbar.addFiles')} hint={t('toolbar.addFilesHint')} disabled={!!loading} onClick={onAddFiles} />
        <ToolButton icon="box-arrow-in-left" label={t('toolbar.insertBefore')} hint={notSingle ? needOne : t('toolbar.insertBeforeHint')} disabled={notSingle || !!loading} onClick={() => onInsert('before')} />
        <ToolButton icon="box-arrow-in-right" label={t('toolbar.insertAfter')} hint={notSingle ? needOne : t('toolbar.insertAfterHint')} disabled={notSingle || !!loading} onClick={() => onInsert('after')} />
        <ToolButton icon="arrow-left-right" label={t('toolbar.replace')} hint={notSingle ? needOne : t('toolbar.replaceHint')} disabled={notSingle || !!loading} onClick={onReplace} />
      </ToolGroup>

      <ToolGroup label={t('toolbar.selection')}>
        <ToolButton icon="arrow-counterclockwise" label={t('toolbar.rotateLeft')} disabled={none} onClick={() => onRotate(-90)} />
        <ToolButton icon="arrow-clockwise" label={t('toolbar.rotateRight')} disabled={none} onClick={() => onRotate(90)} />
        <ToolButton icon="copy" label={t('toolbar.duplicate')} disabled={none} onClick={onDuplicate} />
        <ToolButton icon="layout-split" label={t('toolbar.combine', { size: 2 })} hint={cannotCombine ? needImages : t('toolbar.combineHint', { size: 2 })} disabled={cannotCombine} onClick={() => onCombine(2)} />
        <ToolButton icon="grid" label={t('toolbar.combine', { size: 4 })} hint={cannotCombine ? needImages : t('toolbar.combineHint', { size: 4 })} disabled={cannotCombine} onClick={() => onCombine(4)} />
        <ToolButton
          icon="magic"
          label={t('toolbar.cleanScan')}
          hint={none ? t('toolbar.cleanScanAll') : t('toolbar.cleanScanSelected')}
          disabled={!!loading}
          onClick={onCleanScan}
        />
        <ToolButton icon="trash3" label={t('toolbar.remove')} danger disabled={none} onClick={onRemove} />
      </ToolGroup>

      <ToolGroup label={t('toolbar.history')}>
        <ToolButton icon="arrow-90deg-left" label={t('toolbar.undo')} hint={t('toolbar.undoHint')} disabled={!canUndo} onClick={onUndo} />
        <ToolButton icon="arrow-90deg-right" label={t('toolbar.redo')} hint={t('toolbar.redoHint')} disabled={!canRedo} onClick={onRedo} />
      </ToolGroup>

      <div className="erp-doc-toolbar__status" aria-live="polite">
        {loading ? (
          <span>
            <Spinner size="sm" className="me-2" />
            {t('toolbar.loading', { done: Math.min(loading.done + 1, loading.total), total: loading.total })}
          </span>
        ) : (
          <span className="erp-doc-toolbar__count">
            <Trans ns="pdf" i18nKey="toolbar.selected" values={{ selected: selectedCount, total: pageCount }} components={{ strong: <strong /> }} />
          </span>
        )}
        <button type="button" className="btn btn-link btn-sm" onClick={none ? onSelectAll : onClearSelection}>
          {none ? t('toolbar.selectAll') : t('toolbar.clearSelection')}
        </button>
        <ConfirmAction
          title={t('toolbar.resetTitle')}
          description={t('toolbar.resetDescription')}
          confirmLabel={t('toolbar.resetConfirm')}
          danger
          onConfirm={onReset}
        >
          {({ onClick }) => (
            <button type="button" className="btn btn-link btn-sm erp-doc-toolbar__reset" title={t('toolbar.reset')} onClick={onClick}>
              <Icon name="x-circle" />
              <span className="erp-doc-toolbar__reset-label">{t('toolbar.reset')}</span>
            </button>
          )}
        </ConfirmAction>
      </div>
    </div>
  )
}
