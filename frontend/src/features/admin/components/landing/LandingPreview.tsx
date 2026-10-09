import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { LandingDoc } from '@/features/site-landing'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { useDebounce } from '@/hooks/useDebounce'
import { landingPreviewHtml } from '../../utils/landing-preview'

const DEVICES = [
  { id: 'desktop', label: 'Máy tính', icon: 'display', width: 1280 },
  { id: 'phone', label: 'Điện thoại', icon: 'phone', width: 390 },
] as const

/** Draws the page at its real width and scales it down, so line breaks match what visitors see. */
export function LandingPreview({ doc, landingKey, catalog }: { doc: LandingDoc; landingKey: string; catalog: readonly ToolDefinition[] }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]>(() => window.matchMedia('(max-width: 767.98px)').matches ? DEVICES[1] : DEVICES[0])
  const [box, setBox] = useState({ width: 0, height: 0 })
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const scroll = useRef(0)
  // Every new srcdoc reloads the frame; waiting for a pause in typing keeps it from flickering on each key.
  const settled = useDebounce(doc, 300)
  const html = useMemo(() => landingPreviewHtml(settled, landingKey, catalog), [settled, landingKey, catalog])

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Each reload starts at the top; going back to where staff were reading keeps the edit in view.
  const restoreScroll = () => {
    const view = frame.current?.contentWindow
    if (!view) return
    view.scrollTo(0, scroll.current)
    view.addEventListener('scroll', () => { scroll.current = view.scrollY }, { passive: true })
  }

  const scale = box.width ? Math.min(1, box.width / device.width) : 1
  return (
    <section className="cn-admin-panel cn-admin-lpreview" aria-label="Xem trước">
      <header className="cn-admin-panel__head">
        <h2>Xem trước bản nháp</h2>
        <div className="cn-admin-tabs" role="group" aria-label="Khổ màn hình">
          {DEVICES.map((item) => (
            <button key={item.id} type="button" className={item.id === device.id ? 'is-active' : ''} aria-pressed={item.id === device.id} onClick={() => setDevice(item)}>
              <Icon name={item.icon} /> {item.label}
            </button>
          ))}
        </div>
      </header>
      <div ref={stage} className="cn-admin-lpreview__stage">
        {box.width ? (
          <iframe
            ref={frame}
            title="Xem trước trang giới thiệu"
            // Same origin lets the borrowed icon font load; no scripts run in the page, so nothing can use that origin.
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={restoreScroll}
            style={{ left: (box.width - device.width * scale) / 2, width: device.width, height: box.height / scale, transform: `scale(${scale})` }}
          />
        ) : null}
      </div>
      <p className="cn-admin-sub">Liên kết trong khung xem trước không bấm được. Mở trang thật sau khi xuất bản để thử liên kết.</p>
    </section>
  )
}
