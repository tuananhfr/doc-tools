import { useEffect, type RefObject } from 'react'
import { playTick } from '../services/wheel-sound'
import { angleFromTransform, bordersCrossed, forwardDelta } from '../utils/spin-wheel'

/**
 * Ticks follow the rendered angle, not a timer: the CSS easing decides the speed, so sampling the
 * computed transform each frame is the only way the clicks slow down exactly as the wheel does.
 */
export function useWheelTicks(disc: RefObject<HTMLElement | null>, active: boolean, count: number) {
  useEffect(() => {
    const element = disc.current
    if (!active || !element || count < 2) return
    let frame = 0
    let last = angleFromTransform(getComputedStyle(element).transform) ?? 0
    // Borders sit under the pointer at whole multiples of the slice angle, so count from the real start angle.
    let travelled = last
    const sample = () => {
      const angle = angleFromTransform(getComputedStyle(element).transform)
      if (angle !== null) {
        const step = forwardDelta(last, angle)
        if (bordersCrossed(travelled, travelled + step, count) > 0) playTick()
        travelled += step
        last = angle
      }
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    return () => cancelAnimationFrame(frame)
  }, [disc, active, count])
}
