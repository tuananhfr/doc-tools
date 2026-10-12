import { useEffect, useRef, useState } from 'react'
import { entResult, newDrawKey } from '../services/entertainment.api'
import type { DeckKind, DrawResult, EntertainmentEnvelope } from '../types/entertainment.types'

export function useDraw(kind: DeckKind) {
  const [result, setResult] = useState<EntertainmentEnvelope<DrawResult> | null>(null)
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false); const [revealed, setRevealed] = useState<string[]>([])
  const [drawnAt, setDrawnAt] = useState<Date | null>(null)
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
      if (alive.current) { setResult(value); setDrawnAt(new Date()) }
    } catch (failure) { if (alive.current) setError(failure) }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  const reset = () => { if (running.current) return; attempt.current = null; setResult(null); setDrawnAt(null); setRevealed([]); setExpired(false); setError(null) }
  // The draw response already carries every card, so expiry only ends the server snapshot; revealing and exporting stay local.
  return { result, error, busy, expired, drawnAt, draw, reset, drawKey: attempt.current?.key, revealed,
    reveal: (id: string) => setRevealed(current => current.includes(id) ? current : [...current, id]),
    revealAll: () => { if (result) setRevealed(result.result.cards.map(card => card.id)) },
  }
}
