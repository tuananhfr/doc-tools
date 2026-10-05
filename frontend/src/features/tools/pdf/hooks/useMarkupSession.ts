import { useCallback, useEffect, useState } from 'react'
import { MARKUP_TOOL, type MarkupColor, type MarkupTool } from '../types/markup.types'
import { loadTextMeasure } from '../services/text-measure'
import type { MarkupStyle } from '../utils/markup-draft'
import type { MeasureText } from '../utils/markup-geometry'

/**
 * Trạng thái chế độ Đánh dấu trong ô xem to: công cụ, kiểu nét, dấu đang chọn.
 * Tô sáng nhớ màu riêng (mặc định vàng) — dùng chung màu đỏ của bút là tô đỏ cả đoạn văn.
 */
export function useMarkupSession() {
  const [active, setActive] = useState(false)
  const [tool, setTool] = useState<MarkupTool>(MARKUP_TOOL.pen)
  const [ink, setInk] = useState<MarkupColor>('red')
  const [highlight, setHighlight] = useState<MarkupColor>('yellow')
  const [width, setWidth] = useState<MarkupStyle['width']>(2)
  const [preset, setPreset] = useState<MarkupStyle['preset']>('approved')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [measure, setMeasure] = useState<MeasureText | null>(null)

  useEffect(() => {
    if (!active || measure) return
    let alive = true
    void loadTextMeasure().then((next) => {
      if (alive) setMeasure(() => next)
    })
    return () => {
      alive = false
    }
  }, [active, measure])

  const style: MarkupStyle = { color: tool === MARKUP_TOOL.highlight ? highlight : ink, width, preset }

  const setStyle = useCallback(
    (patch: Partial<MarkupStyle>) => {
      if (patch.color) (tool === MARKUP_TOOL.highlight ? setHighlight : setInk)(patch.color)
      if (patch.width) setWidth(patch.width)
      if (patch.preset) setPreset(patch.preset)
    },
    [tool],
  )

  const chooseTool = useCallback((next: MarkupTool) => {
    setTool(next)
    setSelectedId(null)
  }, [])

  const toggle = useCallback(() => {
    setActive((value) => !value)
    setSelectedId(null)
  }, [])

  return { active, toggle, tool, chooseTool, style, setStyle, selectedId, select: setSelectedId, measure }
}

export type MarkupSession = ReturnType<typeof useMarkupSession>
