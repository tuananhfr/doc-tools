import { useEffect, useRef } from 'react'

const PIECES = 110
const DURATION_MS = 1700
const FADE_MS = 450
const GRAVITY = 900
const COLOR_VARS = ['--cn-wheel-c0', '--cn-wheel-c1', '--cn-wheel-c2', '--cn-wheel-c3', '--cn-wheel-c4', '--cn-wheel-c5']

interface Piece { x: number; y: number; vx: number; vy: number; spin: number; angle: number; w: number; h: number; color: string }

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** One burst from the wheel centre each time `burst` changes; draws nothing when reduced motion is on. */
export function WinConfetti({ burst }: { burst: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = canvas?.parentElement
    const wheel = stage?.querySelector('.cn-wheel')
    const ctx = canvas?.getContext('2d')
    if (!burst || !canvas || !stage || !wheel || !ctx || prefersReducedMotion()) return

    const ratio = window.devicePixelRatio || 1
    const box = stage.getBoundingClientRect()
    canvas.width = Math.round(box.width * ratio)
    canvas.height = Math.round(box.height * ratio)
    ctx.scale(ratio, ratio)

    // Same palette as the slices, read from the tokens so a theme change recolours both.
    const styles = getComputedStyle(stage)
    const colors = COLOR_VARS.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean)
    if (!colors.length) return
    const disc = wheel.getBoundingClientRect()
    const originX = disc.left - box.left + disc.width / 2
    const originY = disc.top - box.top + disc.height / 2
    const pieces: Piece[] = Array.from({ length: PIECES }, () => {
      const direction = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3
      const speed = 380 + Math.random() * 520
      return {
        x: originX, y: originY,
        vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
        spin: (Math.random() - 0.5) * 14, angle: Math.random() * Math.PI,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      }
    })

    let frame = 0
    let previous = performance.now()
    const started = previous
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const elapsed = now - started
      ctx.clearRect(0, 0, box.width, box.height)
      if (elapsed >= DURATION_MS) return
      ctx.globalAlpha = Math.min(1, (DURATION_MS - elapsed) / FADE_MS)
      for (const piece of pieces) {
        piece.vy += GRAVITY * dt
        piece.vx *= 0.99
        piece.x += piece.vx * dt
        piece.y += piece.vy * dt
        piece.angle += piece.spin * dt
        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.angle)
        ctx.fillStyle = piece.color
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h)
        ctx.restore()
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [burst])

  return <canvas ref={canvasRef} className="cn-wheel-confetti" aria-hidden="true" />
}
