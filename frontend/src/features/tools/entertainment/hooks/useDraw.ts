import { useEffect, useRef, useState } from 'react'
import { entResult, newDrawKey } from '../services/entertainment.api'
import type { DeckKind, DrawResult, EntertainmentEnvelope } from '../types/entertainment.types'

export function useDraw(kind: DeckKind) {
  const [result, setResult] = useState<EntertainmentEnvelope<DrawResult> | null>(null)
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false); const [revealed, setRevealed] = useState<string[]>([])
  const attempt = useRef<{ key: string; spread: number; reversed: boolean } | null>(null)
  const running = useRef(false); const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => setExpired(true), Math.max(0, result.result.expires_at * 1000 - Date.now()))
    return () => clearTimeout(timer)
  }, [result])
  const draw = async (spread: number, reversed: boolean) => {
    if (running.current || result) return
    running.current = true; setBusy(true); setError(null)
    try {
      if (!attempt.current || attempt.current.spread !== spread || attempt.current.reversed !== reversed) attempt.current = { key: newDrawKey(), spread, reversed }
      const value = await entResult<DrawResult>(`${kind}/draw`, { spread, reversed }, attempt.current.key)
      if (value.result.kind !== kind || value.result.cards.length !== spread || new Set(value.result.cards.map(card => card.id)).size !== spread) throw new Error('Invalid draw')
      if (alive.current) setResult(value)
    } catch (failure) { if (alive.current) setError(failure) }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  const reset = () => { if (running.current) return; attempt.current = null; setResult(null); setRevealed([]); setExpired(false); setError(null) }
  return { result, error, busy, expired, draw, reset, drawKey: attempt.current?.key, revealed,
    reveal: (id: string) => { if (!expired) setRevealed(current => current.includes(id) ? current : [...current, id]) },
    revealAll: () => { if (result && !expired) setRevealed(result.result.cards.map(card => card.id)) },
  }
}
