import { useCallback, useEffect, useRef, useState } from 'react'
import { loadFamilySpace, saveFamilySpace } from '../storage/family-store'
import { type FamilySpace, validateFamilySpace } from '../core/family'

export function useFamilySpace() {
  const [space, setSpace] = useState<FamilySpace | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const current = useRef<FamilySpace | null>(null)
  const queue = useRef(Promise.resolve())
  const pending = useRef(0)
  useEffect(() => {
    let mounted = true
    void loadFamilySpace().then((value) => { if (mounted) { current.current = value; setSpace(value) } }).catch(() => { if (mounted) setError('Không mở được dữ liệu trên thiết bị. Kiểm tra quyền lưu trữ của trình duyệt.') })
    return () => { mounted = false }
  }, [])
  const persist = useCallback(async (next: FamilySpace, failure: string) => {
    pending.current += 1
    setSaving(true)
    const operation = queue.current.catch(() => undefined).then(() => saveFamilySpace(next))
    queue.current = operation
    try { await operation; if (current.current === next) setSpace(next); setError('') }
    catch { setError(failure); throw new Error(failure) }
    finally { pending.current -= 1; setSaving(pending.current > 0) }
  }, [])
  const update = useCallback(async (change: (value: FamilySpace) => FamilySpace) => {
    if (!current.current) throw new Error('Family data is not ready')
    const next = change(current.current)
    if (!validateFamilySpace(next)) throw new Error('Invalid family data')
    current.current = next
    await persist(next, 'Không lưu được thay đổi. Hãy xuất bản sao lưu và kiểm tra dung lượng thiết bị.')
  }, [persist])
  const replace = useCallback(async (next: FamilySpace) => {
    if (!validateFamilySpace(next)) throw new Error('Invalid family backup')
    current.current = next
    await persist(next, 'Không khôi phục được bản sao lưu.')
  }, [persist])
  return { space, error, saving, update, replace }
}
