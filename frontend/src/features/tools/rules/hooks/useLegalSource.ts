import { useEffect, useState } from 'react'
import { fetchLegalSource, type LegalSourceLookup } from '../services/legal-sources.api'

export type LegalSourceState = { state: 'idle' } | { state: 'loading' } | LegalSourceLookup

/** `idle` khi gói không có `sourceId` — không gọi mạng, khung độ mới tự dùng thông tin trong gói. */
export function useLegalSource(sourceId: string | undefined): LegalSourceState {
  const [lookup, setLookup] = useState<LegalSourceState>(sourceId ? { state: 'loading' } : { state: 'idle' })
  useEffect(() => {
    if (!sourceId) { setLookup({ state: 'idle' }); return }
    let alive = true
    setLookup({ state: 'loading' })
    void fetchLegalSource(sourceId).then((result) => { if (alive) setLookup(result) })
    return () => { alive = false }
  }, [sourceId])
  return lookup
}
