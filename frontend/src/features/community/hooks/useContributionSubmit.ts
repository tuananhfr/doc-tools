import { useEffect, useRef, useState } from 'react'
import { useRefreshMyContributions } from '@/features/account'
import { ContributionApiError, submitContribution } from '../services/contributions.api'
import type { ContributionPayload, ContributionReceipt } from '../types/community.types'

export function useContributionSubmit() {
  const refreshMine = useRefreshMyContributions()
  const [receipt, setReceipt] = useState<ContributionReceipt | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')
  const attempt = useRef<{ body: string; key: string } | null>(null)
  const running = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const submit = async (payload: ContributionPayload) => {
    if (running.current || receipt) return
    running.current = true; setBusy(true); setFailed('')
    try {
      const body = JSON.stringify(payload)
      if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID().replaceAll('-', '') }
      const result = await submitContribution(payload, attempt.current.key)
      if (mounted.current) setReceipt(result)
      if (result.tracked) void refreshMine()
    } catch (error) { if (mounted.current) setFailed(error instanceof ContributionApiError ? error.code : 'NETWORK') }
    finally { running.current = false; if (mounted.current) setBusy(false) }
  }
  return { receipt, busy, failed, submit, reset: () => { if (!running.current) { attempt.current = null; setReceipt(null); setFailed('') } } }
}
