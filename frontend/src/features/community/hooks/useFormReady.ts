import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// Server-rendered fields stay disabled until React can retain their input events.
export function useFormReady() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
