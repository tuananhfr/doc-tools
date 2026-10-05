import { useEffect, useState } from 'react'
import { loadBarcodeEngine, type BarcodeEngine } from '../services/barcode-render'

let pending: Promise<BarcodeEngine> | null = null

/** Bộ dựng mã nạp một lần cho cả phiên; nạp hỏng thì lần sau thử lại chứ không giữ lỗi. */
function engineOnce(): Promise<BarcodeEngine> {
  pending ??= loadBarcodeEngine().catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}

export type EngineState = { status: 'loading' } | { status: 'ready'; engine: BarcodeEngine } | { status: 'failed' }

export function useBarcodeEngine(): EngineState {
  const [state, setState] = useState<EngineState>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    engineOnce().then(
      (engine) => alive && setState({ status: 'ready', engine }),
      () => alive && setState({ status: 'failed' }),
    )
    return () => {
      alive = false
    }
  }, [])
  return state
}
