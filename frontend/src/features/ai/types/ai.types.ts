export const AI_ERROR_CODES = [
  'SIGNED_OUT', 'PRO_REQUIRED', 'UNTRUSTED_REQUEST', 'INVALID_INPUT', 'INVALID_API_BASE', 'AI_UNAVAILABLE', 'AI_UPSTREAM',
  'AI_NO_PROVIDER', 'AI_VERIFY_FAILED', 'AI_NOT_READY', 'AI_DISABLED', 'NOT_FOUND', 'SELECTION_INVALID', 'DUPLICATE_CONTRIBUTION',
  'RATE_LIMITED', 'UPLOAD_TYPE', 'UPLOAD_TOO_LARGE', 'UPLOAD_QUOTA', 'NETWORK', 'UNKNOWN',
] as const
export type AiErrorCode = (typeof AI_ERROR_CODES)[number]

export interface ProviderTypeOption { type: string; label: string; apiBase: string; customBase: boolean }

export type ProviderStatus = 'verifying' | 'ready' | 'failed' | 'disabled'

export interface AiSetup {
  available: boolean
  provider: { type: string; apiBase: string; model: string | null; status: ProviderStatus; lastError: string | null; verifiedAt: number | null } | null
  agent: { status: 'active' | 'inactive'; upToDate: boolean } | null
}

/** `filesUrl` is GoClaw's HTTP root: signed media paths in chat history are relative to it. */
export interface AiTicket { token: string; wsUrl: string; filesUrl: string; userId: string; agentKey: string; expiresAt: number }

export const CONNECTION_STATES = { idle: 'idle', connecting: 'connecting', connected: 'connected', disconnected: 'disconnected', failed: 'failed' } as const
export type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES]

/** `name` is empty when GoClaw kept only a generated file name. */
export interface ChatMedia { kind: 'image' | 'file'; url: string; name: string }

export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; media?: ChatMedia[]; streaming?: boolean; createdAt?: string }

/** A file waiting in the composer. Images go up to our server first; text is read here and sent inline. */
export type ChatAttachment =
  | { id: string; kind: 'image'; name: string; size: number; previewUrl: string; status: 'uploading' | 'ready' | 'failed'; uploadId?: string; error?: AiErrorCode }
  | { id: string; kind: 'text'; name: string; size: number; content: string; status: 'ready' }

export interface AiUpload { id: string; filename: string; mimeType: string; size: number; expiresAt: number }

export interface ChatSessionSummary { key: string; label: string; messageCount: number; updatedAt?: string }

/** What an agent may ask the page to show; anything else in a `cn-action` block is dropped. */
export interface OpenToolAction { type: 'open-tool'; slug: string; params: Record<string, string> }

/** The published rule package a tool page is using, as the source check names it to the agent. */
export interface RuleSnapshot { id: string; effectiveFrom: string; sourceTitle: string; sourceUrl: string }

export interface DraftChange { field: string; before: string; after: string }
export interface DraftSource { url: string; type: 'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER' }

/** What the agent proposed; it becomes a contribution only when its owner picks rows and sends them. */
export interface ContributionDraft {
  id: string; toolId: string; domain: string; baseSnapshotId: string | null; jurisdiction: string | null
  changes: DraftChange[]; sources: DraftSource[]; uncertainties: string[]
  createdBy: 'agent' | 'user'
  /** Unix seconds. */
  createdAt: number
}

export interface DraftSubmitResult { receiptCode: string; status: 'NEEDS_SOURCE' | 'NEEDS_REVIEW'; tracked: boolean; contributionId: string }
