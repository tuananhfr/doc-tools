import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Modal, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { Markup, Rect } from '../types/markup.types'
import type { SearchHit } from '../hooks/useTextSearch'
import { useMarkupSession } from '../hooks/useMarkupSession'
import { usePageText } from '../hooks/usePageText'
import { useReflowProbe } from '../hooks/useReflowProbe'
import type { TextInspector, TextRewriter } from '../hooks/useTextEditSession'
import { inspectText, sameFace, sampleFill } from '../services/text-style'
import { usePagePreview } from '../hooks/usePagePreview'
import { PDF_CSS_SCALE } from '../services/page-preview'
import type { ReflowRequest } from '../services/text-reflow'
import { isTyping } from '../utils/is-typing'
import { restyledMarkup, styleOfMarkup, type MarkupStyle } from '../utils/markup-draft'
import { describeOrigin } from '../utils/page-label'
import { baseToVisual, visualRectToBase, visualSize } from '../utils/page-geometry'
import { stepZoom, type Box, type ZoomMode } from '../utils/preview-zoom'
import { CropBar } from './CropBar'
import { CropOverlay } from './CropOverlay'
import { DecorationOverlay, type StampView } from './DecorationOverlay'
import { MarkupEditor } from './MarkupEditor'
import { MarkupLayer } from './MarkupShapes'
import { MarkupToolbar } from './MarkupToolbar'
import { TextHitLayer } from './TextHitLayer'

interface PagePreviewModalProps {
  page: PageRef
  source: SourceFile
  position: number
  total: number
  stamp: StampView
  /** Kết quả tìm trên trang này — mảng phải ổn định giữa các lần vẽ (useMemo ở trang cha). */
  hits: SearchHit[]
  activeHitId: string | null
  /** Vị trí kết quả đang xem trong toàn bộ kết quả; `null` = không có tìm kiếm. */
  hitPosition: { index: number; total: number } | null
  onHitStep: (delta: 1 | -1) => void
  canUndo: boolean
  canRedo: boolean
  onMarkupsChange: (markups: Markup[]) => void
  /** Cắt trang theo vùng (pt, khung gốc); `true` = đã cắt. */
  onCrop: (area: Rect) => Promise<boolean>
  /** Sửa chữ bằng cách viết lại trang; `true` = đã viết. */
  onRewriteText: (request: ReflowRequest) => Promise<boolean>
  onUndo: () => void
  onRedo: () => void
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onClose: () => void
}

const NO_MARKUPS: Markup[] = []

interface PreviewButtonProps {
  icon: string
  label: string
  hint?: string
  pressed?: boolean
  disabled?: boolean
  /** Chỉ hiện icon — nhãn vẫn còn cho trình đọc màn hình. */
  iconOnly?: boolean
  onClick: () => void
}

function PreviewButton({ icon, label, hint, pressed, disabled, iconOnly, onClick }: PreviewButtonProps) {
  return (
    <button
      type="button"
      className="erp-doc-tool"
      title={hint ?? label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span className={iconOnly ? 'visually-hidden' : 'erp-doc-tool__label'}>{label}</span>
    </button>
  )
}

/** Vị trí tâm khung nhìn tính theo tỉ lệ nội dung — để phóng xong vẫn đứng đúng chỗ đang đọc. */
function viewCenter(element: HTMLElement) {
  return {
    x: (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth,
    y: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight,
  }
}

/**
 * Xem một trang cỡ lớn để đọc chữ — ảnh thu nhỏ ở lưới chỉ rộng 240px — và
 * đánh dấu lên trang. Xoay thêm, số trang/watermark và dấu đều được áp để thấy
 * đúng thứ sẽ xuất ra.
 */
export function PagePreviewModal({
  page,
  source,
  position,
  total,
  stamp,
  hits,
  activeHitId,
  hitPosition,
  onHitStep,
  canUndo,
  canRedo,
  onMarkupsChange,
  onCrop,
  onRewriteText,
  onUndo,
  onRedo,
  onPrev,
  onNext,
  onClose,
}: PagePreviewModalProps) {
  const stage = useRef<HTMLDivElement | null>(null)
  const anchor = useRef<{ x: number; y: number } | null>(null)
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [frame, setFrame] = useState<Box | null>(null)
  const [mode, setMode] = useState<ZoomMode>('page')
  const { host, size, zoom, status } = usePagePreview(source, page, mode, frame)
  const markup = useMarkupSession()
  const markups = page.markups ?? NO_MARKUPS
  const selectedMarkup = markup.selectedId ? markups.find((item) => item.id === markup.selectedId) : undefined
  const selectTool = markup.tool === 'select'
  // Gắn với trang: sang trang khác là thôi cắt, khung cắt trang trước không lạc sang trang sau.
  const [cropState, setCropState] = useState<{ pageId: string; rect: Rect | null; busy: boolean } | null>(null)
  const crop = cropState?.pageId === page.id ? cropState : null
  const cropping = crop !== null
  const setCrop = useCallback(
    (next: { rect: Rect | null; busy: boolean } | null) => setCropState(next && { ...next, pageId: page.id }),
    [page.id],
  )

  // Modal gắn nội dung qua portal sau lượt render đầu — ref callback mới bắt được
  // đúng lúc phần tử xuất hiện, `useEffect` + ref thường có thể chạy khi còn null.
  const attachStage = useCallback((element: HTMLDivElement | null) => {
    stage.current = element
    if (!element) return
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(element)
      setFrame({
        width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      stage.current = null
    }
  }, [])

  const width = size && zoom !== null ? size.width * zoom : 0
  const height = size && zoom !== null ? size.height * zoom : 0
  const pannable = !markup.active && !cropping && frame !== null && (width > frame.width + 1 || height > frame.height + 1)

  const changeMode = useCallback((next: ZoomMode) => {
    if (stage.current) anchor.current = viewCenter(stage.current)
    setMode(next)
  }, [])

  const zoomBy = useCallback(
    (direction: 1 | -1) => {
      if (zoom !== null) changeMode(stepZoom(zoom, direction))
    },
    [zoom, changeMode],
  )

  useLayoutEffect(() => {
    const element = stage.current
    const point = anchor.current
    if (!element || !point) return
    anchor.current = null
    element.scrollLeft = point.x * element.scrollWidth - element.clientWidth / 2
    element.scrollTop = point.y * element.scrollHeight - element.clientHeight / 2
  }, [width, height])

  useLayoutEffect(() => {
    stage.current?.scrollTo(0, 0)
  }, [page.id])

  // Đưa kết quả đang xem vào tầm nhìn — chỉ cuộn khi nó đang khuất, để phóng to không bị giật về chỗ khác.
  const activeHit = hits.find((hit) => hit.id === activeHitId)
  // Mỗi kết quả chỉ tự cuộn tới MỘT lần (mỗi mức phóng) — người dùng tự kéo đi chỗ khác thì không bị giật về.
  const scrolledTo = useRef<string | null>(null)
  useLayoutEffect(() => {
    const element = stage.current
    const sheet = element?.querySelector('.erp-doc-preview__sheet')
    if (!element || !sheet || !activeHit || !size || zoom === null) return
    const target = `${activeHit.id}@${zoom}`
    if (scrolledTo.current === target) return
    scrolledTo.current = target
    const visual = { width: size.width / PDF_CSS_SCALE, height: size.height / PDF_CSS_SCALE }
    const base = visualSize(visual, page.rotation)
    const scale = zoom * PDF_CSS_SCALE
    const points = activeHit.quads.flat().map((point) => baseToVisual(point, base, page.rotation))
    const stageBox = element.getBoundingClientRect()
    const sheetBox = sheet.getBoundingClientRect()
    const left = sheetBox.left - stageBox.left + element.scrollLeft + Math.min(...points.map((point) => point.x)) * scale
    const top = sheetBox.top - stageBox.top + element.scrollTop + Math.min(...points.map((point) => point.y)) * scale
    const right = sheetBox.left - stageBox.left + element.scrollLeft + Math.max(...points.map((point) => point.x)) * scale
    const bottom = sheetBox.top - stageBox.top + element.scrollTop + Math.max(...points.map((point) => point.y)) * scale
    const visible =
      left >= element.scrollLeft && right <= element.scrollLeft + element.clientWidth && top >= element.scrollTop && bottom <= element.scrollTop + element.clientHeight
    if (visible) return
    element.scrollLeft = (left + right) / 2 - element.clientWidth / 2
    element.scrollTop = (top + bottom) / 2 - element.clientHeight / 2
  }, [activeHit, size, zoom, page.rotation])

  const { select, toggle, setStyle, measure } = markup
  const deleteSelected = useCallback(() => {
    if (selectedMarkup) onMarkupsChange(markups.filter((item) => item !== selectedMarkup))
    select(null)
  }, [selectedMarkup, markups, onMarkupsChange, select])

  const restyle = (patch: Partial<MarkupStyle>) => {
    if (selectTool && selectedMarkup) {
      const next = restyledMarkup(selectedMarkup, patch, measure)
      if (next !== selectedMarkup) onMarkupsChange(markups.map((item) => (item === selectedMarkup ? next : item)))
    } else {
      setStyle(patch)
    }
  }

  const marking = markup.active
  const pageText = usePageText(source, page, marking)
  const { pageIndex, sheet } = page
  const inspect = useMemo<TextInspector>(() => {
    const sampled = { pageIndex, sheet }
    return {
      look: (area, run) => inspectText(source, sampled, area, run),
      uniform: (runs) => sameFace(source, sampled, runs),
      fill: (area) => sampleFill(source, sampled, area),
    }
  }, [source, pageIndex, sheet])
  const reflow = useReflowProbe(source, pageIndex, marking && markup.tool === 'editText')
  const { load: probe } = reflow
  const rewriter = useMemo<TextRewriter>(() => ({ probe, rewrite: onRewriteText }), [probe, onRewriteText])
  const [surfaceEdit, setSurfaceEdit] = useState(false)
  const hasSelection = !!selectedMarkup
  const pageSize = useMemo(() => (size ? { width: size.width / PDF_CSS_SCALE, height: size.height / PDF_CSS_SCALE } : null), [size])

  const cancelCrop = useCallback(() => setCrop(null), [setCrop])
  const applyCrop = useCallback(async () => {
    if (!crop?.rect || crop.busy || !pageSize) return
    setCrop({ rect: crop.rect, busy: true })
    // Khung vẽ trên trang NHÌN THẤY; cắt tính ở khung gốc — trang đang xoay thêm thì hai khung lệch nhau.
    const done = await onCrop(visualRectToBase(crop.rect, pageSize, page.rotation))
    setCrop(done ? null : { rect: crop.rect, busy: false })
  }, [crop, pageSize, page.rotation, onCrop, setCrop])

  const startCrop = () => {
    if (marking) toggle()
    setCrop({ rect: null, busy: false })
  }

  useEffect(() => {
    const viewKey = (key: string, shift: boolean) => {
      if (key === 'ArrowLeft' && onPrev) onPrev()
      else if (key === 'ArrowRight' && onNext) onNext()
      else if (key === '+' || key === '=') zoomBy(1)
      else if (key === '-') zoomBy(-1)
      else if (key === '0') changeMode('page')
      else if (key === 'F3' && hitPosition) onHitStep(shift ? -1 : 1)
      else return false
      return true
    }

    // Chế độ đánh dấu: Esc bỏ chọn trước, lần sau mới thoát chế độ — Modal tắt Esc riêng (keyboard=false).
    const markKey = (key: string, mod: boolean, shift: boolean) => {
      if (mod && key === 'z' && !shift) onUndo()
      else if (mod && (key === 'y' || (key === 'z' && shift))) onRedo()
      else if (!mod && (key === 'delete' || key === 'backspace') && hasSelection) deleteSelected()
      else if (!mod && key === 'escape') {
        if (hasSelection) select(null)
        else toggle()
      } else return false
      return true
    }

    const cropKey = (key: string) => {
      if (key === 'escape') cancelCrop()
      else if (key === 'enter') void applyCrop()
      else return false
      return true
    }

    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.altKey) return
      const mod = event.ctrlKey || event.metaKey
      const handled = (cropping && !mod && cropKey(event.key.toLowerCase())) || (marking && markKey(event.key.toLowerCase(), mod, event.shiftKey)) || (!mod && viewKey(event.key, event.shiftKey))
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, zoomBy, changeMode, marking, hasSelection, onUndo, onRedo, deleteSelected, select, toggle, hitPosition, onHitStep, cropping, cancelCrop, applyCrop])

  // Chuột kéo để di chuyển; cảm ứng đã có cuộn gốc của trình duyệt.
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    // `pannable` đã tắt khi đánh dấu — kéo chuột lúc đó là vẽ, không phải di trang.
    if (event.pointerType !== 'mouse' || event.button !== 0 || !pannable) return
    const element = event.currentTarget
    pan.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }
    element.setPointerCapture(event.pointerId)
    element.classList.add('is-panning')
    event.preventDefault()
  }

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const start = pan.current
    if (!start) return
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x)
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y)
  }

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!pan.current) return
    pan.current = null
    event.currentTarget.classList.remove('is-panning')
  }

  const percent = zoom === null ? '—' : `${Math.round(zoom * 100)}%`
  const origin = describeOrigin(source, page.pageIndex)

  return (
    <Modal
      show
      fullscreen
      keyboard={!marking && !cropping}
      onHide={onClose}
      contentClassName="erp-doc-preview"
      aria-labelledby="doc-preview-title"
    >
      <div className="erp-doc-preview__bar">
        <h2 id="doc-preview-title" className="erp-doc-preview__title">
          <span className="erp-doc-preview__no">
            Trang {position}/{total}
          </span>
          <span className="erp-doc-preview__origin" title={source.name}>
            {origin}
            {page.rotation ? ` · xoay ${page.rotation}°` : ''}
          </span>
        </h2>

        <div className="erp-doc-preview__group erp-doc-preview__group--nav" role="group" aria-label="Chuyển trang">
          <PreviewButton icon="chevron-left" label="Trang trước" hint="Trang trước (←)" disabled={!onPrev} onClick={() => onPrev?.()} />
          <PreviewButton icon="chevron-right" label="Trang sau" hint="Trang sau (→)" disabled={!onNext} onClick={() => onNext?.()} />
        </div>

        <div className="erp-doc-preview__group" role="group" aria-label="Thu phóng">
          <PreviewButton icon="zoom-out" label="Thu nhỏ" hint="Thu nhỏ (−)" disabled={zoom === null} onClick={() => zoomBy(-1)} />
          <output className="erp-doc-preview__percent" aria-live="polite" aria-label={`Mức phóng ${percent}`}>
            {percent}
          </output>
          <PreviewButton icon="zoom-in" label="Phóng to" hint="Phóng to (+)" disabled={zoom === null} onClick={() => zoomBy(1)} />
          <PreviewButton icon="arrows-angle-contract" label="Vừa trang" hint="Vừa trang (0)" pressed={mode === 'page'} onClick={() => changeMode('page')} />
          <PreviewButton icon="arrows" label="Vừa ngang" pressed={mode === 'width'} onClick={() => changeMode('width')} />
          <PreviewButton icon="aspect-ratio" label="100%" hint="Cỡ thật (100%)" pressed={mode === 1} onClick={() => changeMode(1)} />
        </div>

        {hitPosition ? (
          <div className="erp-doc-preview__group" role="group" aria-label="Kết quả tìm">
            <PreviewButton icon="chevron-up" label="Kết quả trước" hint="Kết quả trước (Shift+F3)" iconOnly onClick={() => onHitStep(-1)} />
            <output className="erp-doc-preview__percent" aria-label={`Kết quả ${hitPosition.index + 1} trên ${hitPosition.total}`}>
              {hitPosition.index >= 0 ? hitPosition.index + 1 : '–'}/{hitPosition.total}
            </output>
            <PreviewButton icon="chevron-down" label="Kết quả sau" hint="Kết quả sau (F3)" iconOnly onClick={() => onHitStep(1)} />
          </div>
        ) : null}

        <div className="erp-doc-preview__group" role="group" aria-label="Sửa">
          <PreviewButton
            icon="pencil-square"
            label="Đánh dấu"
            hint="Vẽ, tô sáng, ghi chú, đóng dấu lên trang"
            pressed={marking}
            disabled={status === 'error'}
            onClick={() => {
              setCrop(null)
              toggle()
            }}
          />
          {source.kind !== 'collage' ? (
            <PreviewButton
              icon="crop"
              label="Cắt trang"
              hint="Chọn phần trang giữ lại, bỏ lề thừa"
              pressed={cropping}
              disabled={status !== 'ready'}
              onClick={cropping ? cancelCrop : startCrop}
            />
          ) : null}
        </div>

        <button type="button" className="erp-doc-tool erp-doc-preview__close" title="Đóng (Esc)" onClick={onClose}>
          <Icon name="x-lg" />
          <span className="erp-doc-tool__label">Đóng</span>
        </button>
      </div>

      {marking ? (
        <MarkupToolbar
          tool={markup.tool}
          target={markup.tool === 'select' ? (selectedMarkup?.kind ?? null) : markup.tool}
          style={selectTool && selectedMarkup ? { ...markup.style, ...styleOfMarkup(selectedMarkup) } : markup.style}
          realEdit={reflow.status !== 'unavailable' && !surfaceEdit}
          canDelete={hasSelection}
          canUndo={canUndo}
          canRedo={canRedo}
          onTool={markup.chooseTool}
          onStyle={restyle}
          onDelete={deleteSelected}
          onUndo={onUndo}
          onRedo={onRedo}
          onDone={toggle}
        />
      ) : null}

      {crop ? <CropBar rect={crop.rect} busy={crop.busy} onApply={() => void applyCrop()} onCancel={cancelCrop} /> : null}

      <div
        ref={attachStage}
        className={`erp-doc-preview__stage${pannable ? ' is-pannable' : ''}${marking ? ' is-marking' : ''}`}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        {status === 'error' ? (
          <p className="erp-doc-preview__state">
            <Icon name="exclamation-triangle" className="me-2" />
            Không vẽ được trang này.
          </p>
        ) : pageSize && zoom !== null ? (
          <div className="erp-doc-preview__sheet" style={{ width, height }}>
            <div ref={host} className="erp-doc-preview__canvas" />
            <TextHitLayer hits={hits} activeId={activeHitId} size={pageSize} rotation={page.rotation} />
            {marking ? (
              <MarkupEditor
                markups={markups}
                size={pageSize}
                rotation={page.rotation}
                pxPerPt={zoom * PDF_CSS_SCALE}
                tool={markup.tool}
                style={markup.style}
                selectedId={markup.selectedId}
                measure={measure}
                pageText={pageText}
                inspect={inspect}
                rewriter={rewriter}
                onSelect={select}
                onCommit={onMarkupsChange}
                onSurfaceEdit={setSurfaceEdit}
              />
            ) : (
              <MarkupLayer markups={markups} size={pageSize} rotation={page.rotation} />
            )}
            {crop ? <CropOverlay size={pageSize} rect={crop.rect} onChange={(rect) => setCrop({ rect, busy: false })} /> : null}
            <DecorationOverlay
              size={pageSize}
              pageId={page.id}
              index={position - 1}
              view={stamp}
            />
            {status === 'loading' ? (
              <span className="erp-doc-preview__state">
                <Spinner size="sm" className="me-2" />
                Đang vẽ trang…
              </span>
            ) : null}
          </div>
        ) : (
          <span className="erp-doc-preview__state">
            <Spinner size="sm" className="me-2" />
            Đang mở trang…
          </span>
        )}
      </div>
    </Modal>
  )
}
