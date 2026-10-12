import { newId } from '@/utils/id'
import { WHEEL_LIMITS } from '../utils/spin-wheel'

/** Browser-local only: never sent anywhere, shared by everyone using this browser, gone when site data is cleared. */
export const WHEEL_LISTS_KEY = 'chuyen-nho.spin-wheel.lists.v1'
export const MAX_SAVED_LISTS = 20
export const MAX_LIST_NAME = 40

export interface WheelList {
  id: string
  name: string
  options: string[]
  savedAt: number
}

export type SaveOutcome = { kind: 'created' | 'replaced'; lists: WheelList[] } | { kind: 'full' }

function isWheelList(value: unknown): value is WheelList {
  if (!value || typeof value !== 'object') return false
  const list = value as Record<string, unknown>
  return typeof list.id === 'string' && typeof list.name === 'string' && typeof list.savedAt === 'number'
    && Array.isArray(list.options) && list.options.every((option) => typeof option === 'string')
}

/** Tolerates anything in storage (hand-edited, older shape, truncated write): bad entries are skipped, never thrown. */
export function parseWheelLists(raw: string | null): WheelList[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isWheelList)
      .map((list) => ({ ...list, name: list.name.slice(0, MAX_LIST_NAME), options: list.options.slice(0, WHEEL_LIMITS.maxOptions) }))
      .filter((list) => list.name.trim() && list.options.length)
      .slice(0, MAX_SAVED_LISTS)
  } catch {
    return []
  }
}

/** Saving under an existing name (case-insensitive) overwrites it, so re-saving an edited list does not pile up copies. */
export function saveWheelList(lists: WheelList[], name: string, options: string[], now: number): SaveOutcome {
  const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, MAX_LIST_NAME)
  const key = trimmed.toLocaleLowerCase()
  const existing = lists.find((list) => list.name.toLocaleLowerCase() === key)
  if (existing) {
    const updated = { ...existing, name: trimmed, options, savedAt: now }
    return { kind: 'replaced', lists: [updated, ...lists.filter((list) => list !== existing)] }
  }
  if (lists.length >= MAX_SAVED_LISTS) return { kind: 'full' }
  return { kind: 'created', lists: [{ id: newId(), name: trimmed, options, savedAt: now }, ...lists] }
}

export function readWheelLists(): WheelList[] {
  try {
    return parseWheelLists(localStorage.getItem(WHEEL_LISTS_KEY))
  } catch {
    return []
  }
}

/** False when the browser refuses the write (quota, private mode); the screen must say so. */
export function writeWheelLists(lists: WheelList[]): boolean {
  try {
    localStorage.setItem(WHEEL_LISTS_KEY, JSON.stringify(lists))
    return true
  } catch {
    return false
  }
}
