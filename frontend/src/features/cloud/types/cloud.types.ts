export const CLOUD_ERROR_CODES = [
  'SIGNED_OUT', 'PRO_REQUIRED', 'UNTRUSTED_REQUEST', 'INVALID_INPUT', 'NOT_FOUND', 'SAVED_CONFLICT',
  'CLOUD_QUOTA', 'CLOUD_ITEM_TOO_LARGE', 'NETWORK', 'UNKNOWN',
] as const
export type CloudErrorCode = (typeof CLOUD_ERROR_CODES)[number]

export type SavedKind = 'result' | 'bookmark'

/** Listing shape: the payload is fetched one item at a time, when it is opened. */
export interface SavedMeta {
  id: string
  kind: SavedKind
  toolId: string
  title: string
  size: number
  rev: number
  createdAt: number
  updatedAt: number
}

export interface SavedItem extends SavedMeta { payload: unknown }

export interface SavedList {
  items: SavedMeta[]
  usage: { items: number; bytes: number; maxItems: number; maxBytes: number }
  /** False once Pro has ended: items stay readable and deletable, nothing new is saved. */
  writable: boolean
}

export type DraftState = 'none' | 'open' | 'submitted' | 'discarded'

export interface SourceCheckEntry {
  id: string
  toolId: string
  baseSnapshotId: string | null
  createdAt: number
  draft: DraftState
  contributionId: string | null
  contributionStatus: string | null
}

export interface SourceCheckPage { items: SourceCheckEntry[]; next: string | null }

/** What a tool page hands the save bar: its own state in, its own state out. */
export interface SaveAdapter {
  /** The page's current input as plain JSON, or null when there is nothing worth saving yet. */
  snapshot: () => Record<string, unknown> | null
  /** Applies a saved payload; false when it does not fit (older format, edited by hand…). */
  restore: (payload: unknown) => boolean
}
