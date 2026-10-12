import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseOptions, randomFraction, randomIndex, spinTarget, WHEEL_LIMITS } from '../utils/spin-wheel'

const SPIN_MS = 4200
const SPIN_TURNS = 6
// The result is announced on transitionend; this only covers a transition that never fires (tab hidden, CSS overridden).
const SPIN_FALLBACK_MS = 1500

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useSpinWheel(initialText: string) {
  const [text, setText] = useState(initialText)
  const [eliminate, setEliminate] = useState(false)
  const [removed, setRemoved] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [winner, setWinner] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [durationMs, setDurationMs] = useState(SPIN_MS)
  const [spinning, setSpinning] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const parsed = useMemo(() => parseOptions(text), [text])
  // Edited text can drop an eliminated option; only names still in the list count as removed.
  const active = useMemo(() => parsed.options.filter((option) => !removed.includes(option)), [parsed.options, removed])
  // With elimination on, the last winner leaves the wheel only when the next spin starts, so the
  // pointer keeps showing it until then instead of the slices reshuffling under the result.
  const leaving = eliminate && winner !== null && active.includes(winner) ? winner : null
  const pool = leaving ? active.filter((option) => option !== leaving) : active
  const canSpin = !spinning && pool.length >= WHEEL_LIMITS.minOptions

  // Called by the wheel's transitionend and by the fallback timer; whichever comes first wins.
  const finishSpin = useCallback(() => {
    const chosen = pending.current
    if (chosen === null) return
    pending.current = null
    window.clearTimeout(timer.current)
    setSpinning(false)
    setWinner(chosen)
    setHistory((current) => [...current, chosen])
  }, [])

  const spin = useCallback(() => {
    if (!canSpin) return
    if (leaving) setRemoved((current) => [...current, leaving])
    const index = randomIndex(pool.length)
    const chosen = pool[index]
    // Keep the pointer clear of slice borders so nobody argues over a line call.
    const target = spinTarget(rotation, index, pool.length, SPIN_TURNS, 0.15 + 0.7 * randomFraction())
    const duration = prefersReducedMotion() ? 0 : SPIN_MS
    setDurationMs(duration)
    setRotation(target)
    setWinner(null)
    setSpinning(true)
    pending.current = chosen
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(finishSpin, duration ? duration + SPIN_FALLBACK_MS : 0)
  }, [canSpin, leaving, pool, rotation, finishSpin])

  const restore = useCallback(() => {
    setRemoved([])
    setHistory([])
    setWinner(null)
  }, [])

  const replaceText = useCallback((next: string) => {
    setText(next)
    setRemoved([])
    setHistory([])
    setWinner(null)
  }, [])

  return {
    text, setText, replaceText, parsed,
    wheelOptions: active, pool,
    eliminate, setEliminate, removedCount: parsed.options.length - active.length,
    history, winner, rotation, durationMs, spinning, canSpin, spin, finishSpin, restore,
  }
}

export type SpinWheelState = ReturnType<typeof useSpinWheel>
