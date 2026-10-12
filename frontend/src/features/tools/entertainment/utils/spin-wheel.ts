export const WHEEL_LIMITS = { minOptions: 2, maxOptions: 30, maxLength: 40 } as const

export interface ParsedOptions {
  options: string[]
  /** More non-empty lines than `maxOptions`; the extra ones are ignored. */
  overLimit: boolean
  /** At least one line was longer than `maxLength` and got cut. */
  clipped: boolean
}

/** One option per line; blank lines and case-insensitive duplicates are dropped so no option gets two slices. */
export function parseOptions(text: string): ParsedOptions {
  const seen = new Set<string>()
  const options: string[] = []
  let overLimit = false
  let clipped = false
  for (const line of text.split(/\r?\n/)) {
    let option = line.replace(/\s+/g, ' ').trim()
    if (!option) continue
    if (option.length > WHEEL_LIMITS.maxLength) {
      option = option.slice(0, WHEEL_LIMITS.maxLength).trim()
      clipped = true
    }
    const key = option.toLocaleLowerCase()
    if (seen.has(key)) continue
    if (options.length === WHEEL_LIMITS.maxOptions) {
      overLimit = true
      break
    }
    seen.add(key)
    options.push(option)
  }
  return { options, overLimit, clipped }
}

function cryptoUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

/** Uniform index in [0, count). Rejection sampling: plain `% count` would favour the low indexes. */
export function randomIndex(count: number, nextUint32: () => number = cryptoUint32): number {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`count must be a positive integer, got ${count}`)
  const limit = 2 ** 32 - (2 ** 32 % count)
  let value = nextUint32()
  while (value >= limit) value = nextUint32()
  return value % count
}

/** Random fraction in [0, 1) for where inside the winning slice the pointer stops. */
export function randomFraction(nextUint32: () => number = cryptoUint32): number {
  return nextUint32() / 2 ** 32
}

const mod = (value: number, base: number) => ((value % base) + base) % base

/**
 * Slices run clockwise from 12 o'clock and the pointer sits at the top, so the
 * slice under the pointer is the one at angle `-rotation`.
 */
export function sliceAtPointer(rotation: number, count: number): number {
  return Math.floor(mod(-rotation, 360) / (360 / count))
}

/**
 * Next absolute rotation (degrees, always increasing so the wheel never spins
 * back) that leaves `index` under the pointer after at least `turns` full turns.
 * `offset` in [0, 1) is the stopping point inside the slice; callers keep it off
 * the edges so the pointer never sits on a border.
 */
export function spinTarget(current: number, index: number, count: number, turns: number, offset: number): number {
  const slice = 360 / count
  const landing = mod(-(index + offset) * slice, 360)
  return current + turns * 360 + mod(landing - mod(current, 360), 360)
}

/** Rotation in [0, 360) from a computed `matrix(a, b, c, d, e, f)`; null for `none` or anything unparsable. */
export function angleFromTransform(transform: string): number | null {
  const match = /^matrix\(([^,]+),\s*([^,]+),/.exec(transform)
  if (!match) return null
  const a = Number(match[1])
  const b = Number(match[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return mod((Math.atan2(b, a) * 180) / Math.PI, 360)
}

/** Forward travel between two sampled angles; the wheel only turns clockwise and less than a turn per frame. */
export function forwardDelta(previous: number, current: number): number {
  return mod(current - previous, 360)
}

/** Slice borders the pointer passed while the wheel moved from `from` to `to` (absolute, increasing degrees). */
export function bordersCrossed(from: number, to: number, count: number): number {
  const slice = 360 / count
  return Math.max(0, Math.floor(to / slice) - Math.floor(from / slice))
}
