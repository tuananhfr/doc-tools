export const AI_ERROR_CODES = [
  'SIGNED_OUT', 'PRO_REQUIRED', 'UNTRUSTED_REQUEST', 'INVALID_INPUT', 'INVALID_API_BASE', 'AI_UNAVAILABLE', 'AI_UPSTREAM',
  'AI_NO_PROVIDER', 'AI_VERIFY_FAILED', 'AI_NOT_READY', 'AI_DISABLED', 'NETWORK', 'UNKNOWN',
] as const
export type AiErrorCode = (typeof AI_ERROR_CODES)[number]

export interface ProviderTypeOption { type: string; label: string; apiBase: string; customBase: boolean }

export type ProviderStatus = 'verifying' | 'ready' | 'failed' | 'disabled'

export interface AiSetup {
  available: boolean
  provider: { type: string; apiBase: string; model: string | null; status: ProviderStatus; lastError: string | null; verifiedAt: number | null } | null
  agent: { status: 'active' | 'inactive'; upToDate: boolean } | null
}

export interface AiTicket { token: string; wsUrl: string; userId: string; agentKey: string; expiresAt: number }

export const CONNECTION_STATES = { idle: 'idle', connecting: 'connecting', connected: 'connected', disconnected: 'disconnected', failed: 'failed' } as const
export type ConnectionState = (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES]

export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean; createdAt?: string }

export interface ChatSessionSummary { key: string; label: string; messageCount: number; updatedAt?: string }

/** What an agent may ask the page to show; anything else in a `cn-action` block is dropped. */
export interface OpenToolAction { type: 'open-tool'; slug: string; params: Record<string, string> }
