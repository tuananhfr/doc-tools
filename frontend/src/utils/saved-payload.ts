/**
 * Readers for saved payloads. A payload comes back from the server, possibly written by an older
 * version of the page or another device, so tool codecs re-check every field instead of trusting it.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The string at `key`, or null when missing, not a string, or longer than `max`. */
export function stringAt(record: Record<string, unknown>, key: string, max: number): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length <= max ? value : null
}

/** Every listed key as a string, or null when any one of them is not. */
export function stringsAt<K extends string>(record: Record<string, unknown>, keys: readonly K[], max: number): Record<K, string> | null {
  const result = {} as Record<K, string>
  for (const key of keys) {
    const value = stringAt(record, key, max)
    if (value === null) return null
    result[key] = value
  }
  return result
}
