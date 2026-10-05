import { useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { newId } from '@/utils/id'
import type { Markup, MarkupTool, TextEditMarkup } from '../types/markup.types'
import type { PageText } from '../types/text-layer.types'
import { useTextEditSession, type TextInspector, type TextRewriter } from '../hooks/useTextEditSession'
import { canvasRunMeasure } from '../services/text-layer'
import { formatStampDate } from '../utils/decorations'
import {
  coverFrameFromTrail,
  coverFrames,
  coverMarkup,
  drawnMarkup,
  isDrawTool,
  isTextMarkupTool,
  isTooSmall,
  laidOutTextBox,
  laidOutTextEdit,
  placedStamp,
  placedText,
  retypedText,
  snappedMarkups,
  textFontSize,
  visualBounds,
  type DrawTool,
  type MarkupStyle,
  type PageFrame,
  type TextMarkupTool,
} from '../utils/markup-draft'
import {
  markupAt,
  markupBounds,
  markupHandles,
  moveMarkup,
  NOTE_FONT_SIZE,
  resizeMarkup,
  simplifyStroke,
  type HandleId,
  type MeasureText,
} from '../utils/markup-geometry'
import { visualSize, visualToBase, type Point, type QuarterTurn, type Size } from '../utils/page-geometry'
import { caretAt, lineAround, runAt, selectedLines, type Caret } from '../utils/text-select'
import { BaseFrame, MarkupShape } from './MarkupShapes'
import { MarkupTextInput, type TextDraft } from './MarkupTextInput'
import { TextEditInput } from './TextEditInput'

interface MarkupEditorProps {
  markups: Markup[]
  /** Khổ trang nhìn thấy (pt), đã áp mọi xoay. */
  size: Size
  rotation: QuarterTurn
  /** Số px màn hình cho 1 pt ở mức phóng hiện tại — để vùng bắt và tay nắm giữ nguyên cỡ trên màn hình. */
  pxPerPt: number
  tool: MarkupTool
  style: MarkupStyle
  selectedId: string | null
  measure: MeasureText | null
  /** Lớp chữ của trang — có thì tô sáng/gạch bám theo dòng chữ; `null` = chưa đọc xong hoặc trang ảnh. */
  pageText: PageText | null
  /** Lấy mẫu màu/phông cho Sửa chữ / Che chữ; `null` = chưa sẵn sàng. */
  inspect: TextInspector | null
  /** Viết lại trang thật khi sửa chữ; `null` = chỉ che bề mặt. */
  rewriter: TextRewriter | null
  onSelect: (id: string | null) => void
  onCommit: (markups: Markup[]) => void
  onSurfaceEdit: (surface: boolean) => void
}

type Gesture =
  | { type: 'draw'; tool: DrawTool; id: string; trail: Point[]; last: Markup }
  | { type: 'snap'; tool: SnapTool; id: string; anchor: Caret; end: Caret | null; last: Markup[] }
  | { type: 'coverBox'; id: string; trail: Point[]; last: TextEditMarkup }
  | { type: 'move'; from: Point; original: Markup; last: Markup; moved: boolean }
  | { type: 'resize'; handle: HandleId; original: Markup; last: Markup }

type SnapTool = TextMarkupTool | 'editText' | 'cover'

const HANDLE_PX = 10
const MIN_DRAG_PX = 3
// Xem trước lúc kéo: vùng sẽ sửa tô xanh, vùng sẽ che phủ trắng (màu nền thật chỉ biết sau khi lấy mẫu).
const PREVIEW_FILL: [number, number, number] = [1, 1, 1]

function isSnapTool(tool: MarkupTool): tool is SnapTool {
  return isTextMarkupTool(tool) || tool === 'editText' || tool === 'cover'
}

function sameCaret(a: Caret, b: Caret | null) {
  return !b || (a.run === b.run && a.offset === b.offset)
}

/** Nét, hình, chữ, dấu mộc trên trang đang xem to. Chỉ báo lên khi xong một thao tác — mỗi thao tác là một bước hoàn tác. */
export function MarkupEditor({ markups, size, rotation, pxPerPt, tool, style, selectedId, measure, pageText, inspect, rewriter, onSelect, onCommit, onSurfaceEdit }: MarkupEditorProps) {
  const page = useMemo<PageFrame>(() => ({ base: visualSize(size, rotation), rotation }), [size, rotation])
  const gesture = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<Markup | null>(null)
  const [lineDrafts, setLineDrafts] = useState<Markup[]>([])
  const [overText, setOverText] = useState(false)
  const snapRuns = isSnapTool(tool) && pageText && pageText.runs.length > 0 ? pageText.runs : null
  const session = useTextEditSession({ markups, runs: pageText?.runs ?? null, measure, inspect, rewriter, onCommit, onSurfaceEdit })
  // Ref song song với state: blur của ô chữ có thể tới SAU khi đã lưu bằng cú nhấn khác — đọc ref mới biết đã lưu chưa.
  const typing = useRef<TextDraft | null>(null)
  const [text, setText] = useState<TextDraft | null>(null)

  const updateText = (next: TextDraft | null) => {
    typing.current = next
    setText(next)
  }

  const finishText = (keep: boolean) => {
    const current = typing.current
    if (!current) return
    updateText(null)
    const value = current.value.replace(/\s+$/, '')
    if (!keep || !measure) return

    if (current.id) {
      const existing = markups.find((markup) => markup.id === current.id)
      if (!existing || (existing.kind !== 'text' && existing.kind !== 'note')) return
      if (!value.trim()) onCommit(markups.filter((markup) => markup.id !== current.id))
      else if (value !== existing.text) onCommit(markups.map((markup) => (markup.id === current.id ? retypedText(existing, value, measure) : markup)))
    } else if (value.trim()) {
      onCommit([...markups, placedText(current.kind, newId(), value, current.at, { ...style, color: current.color }, page, measure)])
    }
  }

  const editText = (markup: Markup) => {
    if (markup.kind !== 'text' && markup.kind !== 'note') return
    const box = visualBounds(markup, page)
    onSelect(null)
    updateText({
      kind: markup.kind,
      id: markup.id,
      at: { x: box.x, y: box.y },
      fontSize: markup.kind === 'text' ? markup.fontSize : NOTE_FONT_SIZE,
      color: markup.color,
      value: markup.text,
      wrap: markup.wrap,
    })
  }

  const visualPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * size.width, y: ((event.clientY - rect.top) / rect.height) * size.height }
  }
  const toBase = (point: Point) => visualToBase(point, page.base, rotation)
  const tolerance = (event: PointerEvent) => (event.pointerType === 'mouse' ? 6 : 14) / pxPerPt

  const begin = (event: PointerEvent<SVGSVGElement>, next: Gesture) => {
    gesture.current = next
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Chặn mặc định để không bôi đen chữ và không cướp focus — ô chữ đang mở được lưu tường minh ngay dưới.
    event.preventDefault()
    if (typing.current) {
      finishText(true)
      return
    }
    if (session.editingRef.current) {
      session.finish(true)
      return
    }
    // Trang đang được viết lại: nội dung dưới con trỏ sắp đổi, thao tác lúc này sẽ rơi vào trang cũ.
    if (session.busy) return

    const visual = visualPoint(event)
    const base = toBase(visual)
    const reach = tolerance(event)

    if (tool === 'select') {
      const current = markups.find((markup) => markup.id === selectedId)
      const handle = current && markupHandles(current).find((item) => Math.hypot(item.p.x - base.x, item.p.y - base.y) <= reach + HANDLE_PX / 2 / pxPerPt)
      if (current && handle) {
        begin(event, { type: 'resize', handle: handle.id, original: current, last: current })
        return
      }
      const hit = markupAt(markups, base, reach)
      onSelect(hit?.id ?? null)
      if (hit) begin(event, { type: 'move', from: base, original: hit, last: hit, moved: false })
      return
    }

    if (tool === 'stamp') {
      if (measure) onCommit([...markups, placedStamp(newId(), style.preset, formatStampDate(new Date()), visual, page, measure)])
      return
    }

    if (tool === 'text' || tool === 'note') {
      if (!measure) return
      const hit = markupAt(markups, base, reach)
      if (hit?.kind === tool) editText(hit)
      else updateText({ kind: tool, id: null, at: visual, fontSize: textFontSize(tool, style.width), color: style.color, value: '' })
      return
    }

    if (tool === 'editText') {
      const hit = markupAt(markups, base, reach)
      if (hit?.kind === 'textEdit' && hit.text) {
        void session.editExisting(hit)
        return
      }
    }

    // Nhấn trúng chữ thì bám dòng; nhấn ngoài chữ vẫn kéo khung tay như trước (trang scan, vùng hình vẽ).
    const anchor = snapRuns ? caretAt(snapRuns, base, reach, canvasRunMeasure) : null
    if (anchor && isSnapTool(tool)) {
      begin(event, { type: 'snap', tool, id: newId(), anchor, end: null, last: [] })
      return
    }

    if (tool === 'cover') {
      const id = newId()
      const last = coverMarkup(id, coverFrameFromTrail([visual], page), PREVIEW_FILL)
      begin(event, { type: 'coverBox', id, trail: [visual], last })
      setDraft(last)
      return
    }

    if (isDrawTool(tool)) {
      const id = newId()
      const first = drawnMarkup(tool, id, style, [visual], page)
      begin(event, { type: 'draw', tool, id, trail: [visual], last: first })
      setDraft(first)
    }
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    const visual = visualPoint(event)
    if (!current) {
      const over = snapRuns !== null && runAt(snapRuns, toBase(visual), tolerance(event)) >= 0
      if (over !== overText) setOverText(over)
      return
    }

    if (current.type === 'snap') {
      current.end = snapRuns && caretAt(snapRuns, toBase(visual), Infinity, canvasRunMeasure)
      const lines = current.end && snapRuns ? selectedLines(snapRuns, current.anchor, current.end, canvasRunMeasure) : []
      const id = current.id
      current.last =
        current.tool === 'cover'
          ? coverFrames(lines).map((frame, index) => coverMarkup(`${id}-${index}`, frame, PREVIEW_FILL))
          : current.tool === 'editText'
            ? snappedMarkups('highlight', id, { ...style, color: 'blue' }, lines)
            : snappedMarkups(current.tool, id, style, lines)
      setLineDrafts(current.last)
      return
    }

    if (current.type === 'coverBox') {
      current.trail = [current.trail[0], visual]
      current.last = coverMarkup(current.id, coverFrameFromTrail(current.trail, page), PREVIEW_FILL)
      setDraft(current.last)
      return
    }

    if (current.type === 'draw') {
      current.trail = current.tool === 'pen' ? [...current.trail, visual] : [current.trail[0], visual]
      current.last = drawnMarkup(current.tool, current.id, style, current.trail, page)
    } else if (current.type === 'move') {
      const base = toBase(visual)
      const dx = base.x - current.from.x
      const dy = base.y - current.from.y
      current.moved ||= Math.hypot(dx, dy) * pxPerPt >= MIN_DRAG_PX
      if (!current.moved) return
      current.last = moveMarkup(current.original, dx, dy)
    } else {
      const resized = resizeMarkup(current.original, current.handle, toBase(visual))
      current.last = !measure
        ? resized
        : resized.kind === 'textEdit'
          ? laidOutTextEdit(resized, measure)
          : resized.kind === 'text' || resized.kind === 'note'
            ? laidOutTextBox(resized, measure)
            : resized
    }
    setDraft(current.last)
  }

  const onPointerUp = () => {
    const current = gesture.current
    gesture.current = null
    setDraft(null)
    setLineDrafts([])
    if (!current) return

    // Kéo qua nhiều dòng = nhiều dấu nhưng một lần commit — một bước hoàn tác.
    if (current.type === 'snap') {
      if (current.tool === 'editText' || current.tool === 'cover') {
        if (!snapRuns) return
        // Bấm không kéo: lấy trọn khúc chữ dưới con trỏ.
        const clicked = sameCaret(current.anchor, current.end)
        const [from, to] = clicked ? lineAround(snapRuns, current.anchor.run) : [current.anchor, current.end as Caret]
        if (current.tool === 'editText') void session.begin(from, to, clicked)
        else void session.cover(coverFrames(selectedLines(snapRuns, from, to, canvasRunMeasure)))
      } else if (current.last.length > 0) {
        onCommit([...markups, ...current.last])
      }
    } else if (current.type === 'coverBox') {
      if (!isTooSmall(current.last, MIN_DRAG_PX / pxPerPt)) void session.cover([current.last.frame])
    } else if (current.type === 'draw') {
      let result = current.last
      if (result.kind === 'pen') result = { ...result, points: simplifyStroke(result.points, 0.75 / pxPerPt) }
      if (!isTooSmall(result, MIN_DRAG_PX / pxPerPt)) onCommit([...markups, result])
    } else if (current.last !== current.original) {
      onCommit(markups.map((markup) => (markup.id === current.last.id ? current.last : markup)))
    }
  }

  const onPointerCancel = () => {
    gesture.current = null
    setDraft(null)
    setLineDrafts([])
  }

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (tool !== 'select' || !measure) return
    const rect = event.currentTarget.getBoundingClientRect()
    const base = toBase({ x: ((event.clientX - rect.left) / rect.width) * size.width, y: ((event.clientY - rect.top) / rect.height) * size.height })
    const hit = markupAt(markups, base, 6 / pxPerPt)
    if (hit?.kind === 'textEdit') {
      if (hit.text) void session.editExisting(hit)
    } else if (hit) {
      editText(hit)
    }
  }

  const editing = session.editing
  const shown = markups.filter((markup) => markup.id !== text?.id && markup.id !== editing?.markup.id).map((markup) => (draft?.id === markup.id ? draft : markup))
  const adding = draft && !markups.some((markup) => markup.id === draft.id) ? draft : null
  const selected = tool === 'select' ? shown.find((markup) => markup.id === selectedId) : undefined
  const outline = selected ? markupBounds(selected) : null
  const handleSize = HANDLE_PX / pxPerPt

  return (
    <>
      <svg
        className="erp-doc-markup"
        data-tool={tool}
        data-over-text={snapRuns && overText ? '' : undefined}
        aria-busy={session.busy || undefined}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        role="group"
        aria-label="Vùng đánh dấu trang"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
      >
        <BaseFrame base={page.base} rotation={rotation}>
          {shown.map((markup) => (
            <MarkupShape key={markup.id} markup={markup} />
          ))}
          {adding ? <MarkupShape markup={adding} /> : null}
          {lineDrafts.map((markup) => (
            <MarkupShape key={markup.id} markup={markup} />
          ))}
          {/* Đang gõ: chỉ vẽ phần che, chữ mới nằm trong ô gõ đè lên. */}
          {editing ? <MarkupShape markup={{ ...editing.markup, lines: [] }} /> : null}
          {selected && outline ? (
            <>
              <rect className="erp-doc-markup__outline" x={outline.x} y={outline.y} width={outline.width} height={outline.height} vectorEffect="non-scaling-stroke" />
              {markupHandles(selected).map((handle) => (
                <rect
                  key={handle.id}
                  className="erp-doc-markup__handle"
                  x={handle.p.x - handleSize / 2}
                  y={handle.p.y - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </>
          ) : null}
        </BaseFrame>
      </svg>
      {editing ? (
        <TextEditInput markup={editing.markup} page={size} frame={page} pxPerPt={pxPerPt} block={editing.reflow?.block} onChange={session.change} onDone={session.finish} />
      ) : null}
      {text && measure ? (
        <MarkupTextInput
          draft={text}
          page={size}
          pxPerPt={pxPerPt}
          measure={measure}
          onChange={(value) => updateText({ ...text, value })}
          onDone={finishText}
        />
      ) : null}
    </>
  )
}
