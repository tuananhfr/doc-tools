import { useEffect, useState } from 'react'

/** Tra ve gia tri tre sau `delay` ms - dung cho o tim kiem cua bang du lieu. */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
