import { useEffect, useState } from 'react'

/** Seconds left until `until` (ms epoch), ticking once a second; 0 once passed. */
export function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // `now` may date from the first render, long before `until` was set.
    setNow(Date.now())
    if (until <= Date.now()) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}
