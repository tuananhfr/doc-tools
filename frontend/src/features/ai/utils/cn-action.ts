import type { OpenToolAction } from '../types/ai.types'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PARAM_KEY = /^[A-Za-z][A-Za-z0-9]{0,31}$/

/**
 * Reads a ```cn-action block written by the agent. The model can be talked into writing anything,
 * so this accepts exactly the shape `cn_open_tool` produces and the caller still checks the slug
 * against the live catalog before drawing a button.
 */
export function parseCnAction(raw: string): OpenToolAction | null {
  let value: unknown
  try { value = JSON.parse(raw) } catch { return null }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const { type, slug, params } = value as Record<string, unknown>
  if (type !== 'open-tool' || typeof slug !== 'string' || slug.length > 64 || !SLUG.test(slug)) return null
  if (params === undefined) return { type, slug, params: {} }
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null
  const entries = Object.entries(params as Record<string, unknown>)
  if (entries.length > 5) return null
  const clean: Record<string, string> = {}
  for (const [key, entry] of entries) {
    if (!PARAM_KEY.test(key) || typeof entry !== 'string' || entry.length > 200) return null
    clean[key] = entry
  }
  return { type, slug, params: clean }
}
