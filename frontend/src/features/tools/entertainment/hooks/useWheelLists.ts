import { useCallback, useEffect, useState } from 'react'
import { readWheelLists, saveWheelList, WHEEL_LISTS_KEY, writeWheelLists, type WheelList } from '../services/wheel-lists.store'

export type WheelListsNotice =
  | { kind: 'created' | 'replaced'; name: string }
  | { kind: 'full' | 'saveFailed' }
  | null

export function useWheelLists() {
  const [lists, setLists] = useState<WheelList[]>([])
  const [notice, setNotice] = useState<WheelListsNotice>(null)

  // Read after mount: localStorage does not exist during SSR.
  useEffect(() => {
    setLists(readWheelLists())
    // Another tab saved or deleted: take its copy so the next write here does not undo it.
    const onStorage = (event: StorageEvent) => {
      if (event.key === WHEEL_LISTS_KEY || event.key === null) setLists(readWheelLists())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const save = useCallback((name: string, options: string[]) => {
    const outcome = saveWheelList(readWheelLists(), name, options, Date.now())
    if (outcome.kind === 'full') {
      setNotice({ kind: 'full' })
      return false
    }
    if (!writeWheelLists(outcome.lists)) {
      setNotice({ kind: 'saveFailed' })
      return false
    }
    setLists(outcome.lists)
    setNotice({ kind: outcome.kind, name: outcome.lists[0].name })
    return true
  }, [])

  const remove = useCallback((id: string) => {
    const next = readWheelLists().filter((list) => list.id !== id)
    if (!writeWheelLists(next)) {
      setNotice({ kind: 'saveFailed' })
      return
    }
    setLists(next)
    setNotice(null)
  }, [])

  return { lists, notice, save, remove }
}
