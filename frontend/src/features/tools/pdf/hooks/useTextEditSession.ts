import { useEffect, useRef, useState } from 'react'
import { newId } from '@/utils/id'
import type { Markup, OrientedBox, Rect, TextEditMarkup } from '../types/markup.types'
import type { TextRun } from '../types/text-layer.types'
import { requestLocalFonts, resolveLocalFont, resolveLocalFontSoon } from '../services/local-fonts'
import { canvasRunMeasure } from '../services/text-layer'
import { loadFontFace } from '../services/text-measure'
import type { ReflowProbe, ReflowRequest } from '../services/text-reflow'
import type { Rgb } from '../utils/decorations'
import { coverFrames, coverMarkup, laidOutReflow, laidOutTextEdit, textEditFromSpans, WRAP_SLACK, type TextLook } from '../utils/markup-draft'
import { orientedBounds, type MeasureText } from '../utils/markup-geometry'
import { visualSize } from '../utils/page-geometry'
import { planReflow, type ReflowPlan } from '../utils/reflow-layout'
import { paragraphAround } from '../utils/text-paragraph'
import { pageSegments, selectedLines, wholeSegments, type Caret, type LineSpan } from '../utils/text-select'

/** Lấy mẫu màu/phông từ trang đã vẽ — do ô xem to cấp vì chỉ nó biết tệp nguồn. */
export interface TextInspector {
  look: (area: Rect, run: TextRun | null) => Promise<TextLook>
  /** Các mảnh chữ có chung một kiểu đậm / nghiêng không. */
  uniform: (runs: TextRun[]) => Promise<boolean>
  fill: (area: Rect) => Promise<Rgb>
}

/** Viết lại trang thật thay cho che bề mặt — do ô xem to cấp cùng lý do với `TextInspector`. */
export interface TextRewriter {
  /** `null` = trang này không viết lại được (bản scan, trang OCR). */
  probe: () => Promise<ReflowProbe | null>
  /** `false` = không viết được, chữ đã gõ phải còn nguyên để thử lại. */
  rewrite: (request: ReflowRequest) => Promise<boolean>
}

/** Kế hoạch viết lại gắn với đúng nguồn lúc bấm vào chữ. */
type Reflow = ReflowPlan & { sourceId: string }

export interface TextEditing {
  markup: TextEditMarkup
  /** Dấu mới tạo từ chữ gốc — lưu mà không đổi chữ thì bỏ, không che vô ích. */
  isNew: boolean
  original: string
  /** Có = lưu là viết lại trang; thiếu = chỉ che trên bề mặt. */
  reflow?: Reflow
}

interface Options {
  markups: Markup[]
  runs: TextRun[] | null
  measure: MeasureText | null
  inspect: TextInspector | null
  rewriter: TextRewriter | null
  onCommit: (markups: Markup[]) => void
  /** Đang sửa một chỗ chỉ che được bề mặt — thanh công cụ phải nói ra. */
  onSurfaceEdit: (surface: boolean) => void
}

/**
 * Sửa chữ / che chữ trong ô xem to. Lấy mẫu màu là việc bất đồng bộ (vẽ lại
 * trang ở độ phân giải cao), nên lúc lưu đọc danh sách dấu MỚI NHẤT qua ref —
 * dùng biến của lần vẽ lúc bấm là ghi đè mất dấu vừa thêm trong lúc chờ.
 */
export function useTextEditSession({ markups, runs, measure, inspect, rewriter, onCommit, onSurfaceEdit }: Options) {
  const latest = useRef(markups)
  useEffect(() => {
    latest.current = markups
  }, [markups])

  // Ref song song với state như ô gõ chữ: blur có thể tới sau khi đã lưu bằng cú nhấn khác.
  const editingRef = useRef<TextEditing | null>(null)
  const [editing, setEditingState] = useState<TextEditing | null>(null)
  // Viết lại trang đổi nguồn của trang: bấm sửa chỗ khác khi chưa xong là lên kế hoạch trên nội dung sắp bị thay.
  const working = useRef(false)
  const [busy, setBusyState] = useState(false)

  const setBusy = (next: boolean) => {
    working.current = next
    setBusyState(next)
  }

  const setEditing = (next: TextEditing | null) => {
    editingRef.current = next
    setEditingState(next)
    onSurfaceEdit(next !== null && !next.reflow)
  }

  const layout = (markup: TextEditMarkup, reflow: Reflow | undefined, measure: MeasureText) =>
    reflow ? laidOutReflow(markup, reflow.block, measure) : laidOutTextEdit(markup, measure)

  /** Người dùng trả lời hộp hỏi quyền sau khi ô gõ đã mở: đổi sang phông gốc ngay trong lúc gõ. */
  const adoptLocalFont = (id: string, sourceFont: string, font: TextEditMarkup['font']) => {
    void resolveLocalFont(sourceFont, font).then((local) => {
      const current = editingRef.current
      if (!local || !measure || current?.markup.id !== id || current.markup.font.local) return
      setEditing({ ...current, markup: layout({ ...current.markup, font: { ...current.markup.font, local } }, current.reflow, measure) })
    })
  }

  /**
   * Viết lại được thì lấy TRỌN các khúc chữ ở hai đầu vùng chọn: sửa nửa dòng là nửa còn lại đứng yên, chữ mới dài ra
   * đè lên nó. Bấm (không kéo) thì lấy cả đoạn văn như Word; đoạn lẫn chữ đậm / nghiêng chỉ lấy dòng được bấm.
   */
  const planFor = async (from: Caret, to: Caret, paragraph: boolean): Promise<{ spans: LineSpan[]; reflow?: Reflow }> => {
    const exact = () => ({ spans: selectedLines(runs ?? [], from, to, canvasRunMeasure) })
    const probe = await rewriter?.probe().catch(() => null)
    if (!probe || !runs) return exact()
    const neighbours = pageSegments(runs, canvasRunMeasure)
    const planned = (first: Caret, last: Caret) => {
      const spans = selectedLines(runs, first, last, canvasRunMeasure)
      const plan = planReflow(spans, neighbours, probe.objects, visualSize(probe.box, probe.rotation))
      return plan ? { spans, reflow: { ...plan, sourceId: probe.sourceId } } : null
    }
    if (paragraph) {
      const [first, last] = paragraphAround(runs, from.run, canvasRunMeasure, probe.objects)
      const whole = planned(first, last)
      if (whole && whole.spans.length > 1 && (await inspect?.uniform(runs.slice(first.run, last.run + 1)).catch(() => false))) return whole
    }
    return planned(...wholeSegments(runs, from, to)) ?? exact()
  }

  /** Chữ gốc gõ lại phải vừa đúng các dòng cũ — đo hụt nửa điểm là dòng gốc tự xuống hàng khi chưa sửa gì. */
  const fitted = (reflow: Reflow, spans: LineSpan[], font: TextEditMarkup['font'], measure: MeasureText): Reflow => {
    const { block } = reflow
    const ends = spans.map((span, index) => (index === 0 ? 0 : block.left) + measure(span.text, block.size, font.bold, font) * (1 + WRAP_SLACK))
    return { ...reflow, block: { ...block, right: Math.max(block.right, ...ends) } }
  }

  /** Bắt đầu sửa đoạn chữ giữa hai con trỏ; `paragraph` = người dùng bấm vào chữ chứ không kéo chọn. */
  const begin = async (from: Caret, to: Caret, paragraph = false) => {
    if (!inspect || !measure || !runs || working.current) return
    // Trước mọi `await`: trình duyệt chỉ hiện hộp hỏi quyền đọc phông khi còn trong thao tác bấm.
    void requestLocalFonts()
    setBusy(true)
    try {
      const { spans, reflow } = await planFor(from, to, paragraph)
      if (spans.length === 0) return
      const area = orientedBounds(coverFrames(spans.slice(0, 1))[0])
      const look = await inspect.look(area, runs[spans[0].run] ?? null)
      const local = await resolveLocalFontSoon(look.sourceFont, look.font)
      const font = local ? { ...look.font, local } : look.font
      await loadFontFace(font)
      const base = textEditFromSpans(newId(), spans, { ...look, font }, measure)
      if (!base) return
      const plan = reflow && fitted(reflow, spans, font, measure)
      const markup = plan ? laidOutReflow(base, plan.block, measure) : base
      setEditing({ markup, isNew: true, original: markup.text, reflow: plan })
      if (!local && look.sourceFont) adoptLocalFont(markup.id, look.sourceFont, look.font)
    } finally {
      setBusy(false)
    }
  }

  const editExisting = async (markup: TextEditMarkup) => {
    await loadFontFace(markup.font)
    setEditing({ markup, isNew: false, original: markup.text })
  }

  const change = (text: string) => {
    const current = editingRef.current
    if (!current || !measure) return
    setEditing({ ...current, markup: layout({ ...current.markup, text }, current.reflow, measure) })
  }

  const rewrite = async (current: TextEditing, reflow: Reflow, markup: TextEditMarkup) => {
    setBusy(true)
    try {
      const done = await rewriter?.rewrite({ ...reflow, lines: markup.lines, font: markup.font, ink: markup.ink }).catch(() => false)
      if (!done) setEditing(current)
    } finally {
      setBusy(false)
    }
  }

  const finish = (keep: boolean) => {
    const current = editingRef.current
    if (!current) return
    setEditing(null)
    if (!keep) return
    const text = current.markup.text.replace(/\s+$/, '')
    if (text === current.original) return
    const markup = measure ? layout({ ...current.markup, text }, current.reflow, measure) : current.markup
    if (current.reflow) {
      void rewrite(current, current.reflow, markup)
      return
    }
    const list = latest.current
    onCommit(current.isNew ? [...list, markup] : list.map((item) => (item.id === markup.id ? markup : item)))
  }

  /** Che các khung — mỗi khung lấy màu nền riêng, cả loạt là một bước hoàn tác. */
  const cover = async (frames: OrientedBox[]) => {
    if (!inspect || frames.length === 0) return
    setBusy(true)
    try {
      const added = await Promise.all(frames.map(async (frame) => coverMarkup(newId(), frame, await inspect.fill(orientedBounds(frame)))))
      onCommit([...latest.current, ...added])
    } finally {
      setBusy(false)
    }
  }

  return { editing, editingRef, busy, begin, editExisting, change, finish, cover }
}

export type TextEditSession = ReturnType<typeof useTextEditSession>
