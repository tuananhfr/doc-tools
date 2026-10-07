/**
 * The slice of GoClaw's WebSocket protocol a ticket may use (goclaw pkg/protocol). The first frame
 * after opening must be `connect`; then `req` / `res` pairs plus pushed `event` frames.
 */
export const WS_METHODS = {
  connect: 'connect',
  chatSend: 'chat.send',
  chatAbort: 'chat.abort',
  chatSessionStatus: 'chat.session.status',
  sessionsList: 'sessions.list',
  sessionsPreview: 'sessions.preview',
  sessionsDelete: 'sessions.delete',
} as const

export interface WsResponseFrame { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { code?: string; message?: string } }
/** The name sits in `event`, not `name`. */
export interface WsEventFrame { type: 'event'; event: string; payload?: unknown; seq?: number }
export type WsFrame = WsResponseFrame | WsEventFrame

export const isResponseFrame = (frame: WsFrame): frame is WsResponseFrame => frame.type === 'res'
export const isEventFrame = (frame: WsFrame): frame is WsEventFrame => frame.type === 'event'

/** Every run event arrives as `agent`; the real kind is `payload.type`. */
export const AGENT_EVENT = 'agent'

export interface AgentEventPayload {
  type?: string
  sessionKey?: string
  runId?: string
  channel?: string
  runKind?: string
  /** Chunk text is nested one level down, not on the event itself. */
  payload?: { content?: string; error?: string; [key: string]: unknown }
  [key: string]: unknown
}

export const AGENT_EVENT_TYPES = {
  runStarted: 'run.started',
  chunk: 'chunk',
  runCompleted: 'run.completed',
  runFailed: 'run.failed',
  runCancelled: 'run.cancelled',
} as const

/** An expired ticket: fetch a new one, unlike an ordinary refusal. */
export const WS_ERROR_UNAUTHORIZED = 'UNAUTHORIZED'
