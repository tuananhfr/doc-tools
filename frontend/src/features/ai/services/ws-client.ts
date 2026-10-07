import { CONNECTION_STATES, type AiTicket, type ConnectionState } from '../types/ai.types'
import { WS_ERROR_UNAUTHORIZED, WS_METHODS, isEventFrame, isResponseFrame, type WsFrame, type WsResponseFrame } from './ws-protocol'

type EventListener = (payload: unknown) => void
interface PendingRequest { resolve: (payload: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }

export class AgentWsError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AgentWsError'
    this.code = code
  }
}

const REQUEST_TIMEOUT = 60_000
/**
 * `chat.send` only answers once the whole run has finished, and a run with tool calls easily passes
 * 60s. This is just a leak guard; the real end of a run is the `run.completed` event.
 */
const CHAT_SEND_TIMEOUT = 15 * 60_000
const BASE_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 30_000
const MAX_RECONNECT_ATTEMPTS = 10
/** Renew at 80% of the ticket's life: RPCs that land between minting and `connect` would fail. */
const RENEW_AT_RATIO = 0.8
const MIN_RENEW_DELAY = 30_000

/**
 * Socket to GoClaw, authorised by a short-lived ticket from our backend. Ported from ERPCons
 * (features/core/assistant/services/ws-client.ts); the traps it handles are real:
 *
 * - Tickets live in GoClaw's memory, so a GoClaw restart kills them just like expiry. A dropped
 *   socket always reconnects with a NEW ticket; retrying the old one never helps. The running
 *   reply survives: GoClaw detaches runs from the connection and routes events by user.
 * - GoClaw checks ticket expiry on every RPC but only returns an error, it does not close the
 *   socket, so `onclose` never fires. Renewal therefore re-sends `connect` with a fresh ticket on
 *   the open socket, which replaces it in place without interrupting a streaming reply.
 */
export class AgentWsClient {
  private socket: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private listeners = new Map<string, Set<EventListener>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private closedOnPurpose = false
  private authenticated = false
  private seq = 0
  // StrictMode runs effects twice; without this the second call slips through the ticket await.
  private connecting = false
  // Bumped by disconnect(): a connect() still awaiting its ticket must not open a socket afterwards,
  // or StrictMode's connect/disconnect/connect leaves two sockets and the first reports "connected"
  // while the live one is still opening.
  private generation = 0
  private ticket: AiTicket | null = null
  private renewTimer: ReturnType<typeof setTimeout> | null = null
  // Many RPCs fail together when a ticket expires; they share one renewal.
  private renewing: Promise<boolean> | null = null
  private networkListenersOn = false

  constructor(private readonly requestTicket: () => Promise<AiTicket>, private readonly onStateChange: (state: ConnectionState) => void) {}

  get isConnected() { return this.authenticated && this.socket?.readyState === WebSocket.OPEN }
  get agentKey() { return this.ticket?.agentKey ?? '' }
  get filesUrl() { return this.ticket?.filesUrl ?? '' }

  async connect(): Promise<void> {
    if (this.socket || this.connecting) return
    this.connecting = true
    this.closedOnPurpose = false
    const attempt = this.generation
    this.installNetworkListeners()
    this.onStateChange(CONNECTION_STATES.connecting)
    let ticket: AiTicket
    try {
      ticket = await this.requestTicket()
    } catch {
      if (attempt !== this.generation) return
      this.connecting = false
      this.onStateChange(CONNECTION_STATES.failed)
      return
    }
    if (attempt !== this.generation || this.closedOnPurpose) return

    this.ticket = ticket
    const socket = new WebSocket(ticket.wsUrl)
    this.socket = socket
    socket.onopen = () => {
      this.connecting = false
      if (this.socket === socket) void this.authenticate(ticket)
    }
    socket.onmessage = (event) => this.handleFrame(String(event.data))
    socket.onclose = () => {
      this.connecting = false
      if (this.socket !== socket) return
      this.socket = null
      this.authenticated = false
      this.rejectAllPending('closed')
      this.onStateChange(CONNECTION_STATES.disconnected)
      if (!this.closedOnPurpose) this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.generation += 1
    this.closedOnPurpose = true
    this.connecting = false
    this.removeNetworkListeners()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.renewTimer) clearTimeout(this.renewTimer)
    this.reconnectTimer = null
    this.renewTimer = null
    const socket = this.socket
    this.socket = null
    this.authenticated = false
    this.rejectAllPending('disconnected')
    socket?.close()
    this.onStateChange(CONNECTION_STATES.idle)
  }

  /** On UNAUTHORIZED, renew once and retry once: a fresh ticket refused again is not an expiry problem. */
  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    try {
      return await this.rawCall<T>(method, params)
    } catch (error) {
      const expired = error instanceof AgentWsError && error.code === WS_ERROR_UNAUTHORIZED && method !== WS_METHODS.connect
      if (expired && (await this.renewTicket())) return this.rawCall<T>(method, params)
      throw error
    }
  }

  private rawCall<T>(method: string, params?: unknown): Promise<T> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new AgentWsError('not connected'))
    const id = String(++this.seq)
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new AgentWsError('timeout'))
      }, method === WS_METHODS.chatSend ? CHAT_SEND_TIMEOUT : REQUEST_TIMEOUT)
      this.pending.set(id, { resolve: resolve as (payload: unknown) => void, reject, timer })
      socket.send(JSON.stringify({ type: 'req', id, method, params }))
    })
  }

  private renewTicket(): Promise<boolean> {
    if (this.renewing) return this.renewing
    this.renewing = (async () => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false
      try {
        const ticket = await this.requestTicket()
        await this.rawCall(WS_METHODS.connect, { token: ticket.token, user_id: ticket.userId, locale: 'vi' })
        this.ticket = ticket
        this.scheduleRenew(ticket)
        return true
      } catch {
        // Already dead (laptop slept past expiry): close so `onclose` starts the normal reconnect.
        this.socket?.close()
        return false
      } finally {
        this.renewing = null
      }
    })()
    return this.renewing
  }

  private scheduleRenew(ticket: AiTicket): void {
    if (this.renewTimer) clearTimeout(this.renewTimer)
    this.renewTimer = null
    const remaining = ticket.expiresAt * 1000 - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) return
    this.renewTimer = setTimeout(() => void this.renewTicket(), Math.max(MIN_RENEW_DELAY, remaining * RENEW_AT_RATIO))
  }

  on(eventName: string, listener: EventListener): () => void {
    const set = this.listeners.get(eventName) ?? new Set<EventListener>()
    set.add(listener)
    this.listeners.set(eventName, set)
    return () => { set.delete(listener) }
  }

  private async authenticate(ticket: AiTicket): Promise<void> {
    try {
      // GoClaw takes the identity from the ticket itself; `user_id` only matches the contract.
      await this.rawCall(WS_METHODS.connect, { token: ticket.token, user_id: ticket.userId, locale: 'vi' })
      this.authenticated = true
      this.reconnectAttempts = 0
      this.scheduleRenew(ticket)
      this.onStateChange(CONNECTION_STATES.connected)
    } catch {
      this.authenticated = false
      this.onStateChange(CONNECTION_STATES.failed)
      this.socket?.close()
    }
  }

  private handleFrame(raw: string): void {
    let frame: WsFrame
    try { frame = JSON.parse(raw) as WsFrame } catch { return }
    if (isResponseFrame(frame)) this.settle(frame)
    else if (isEventFrame(frame)) for (const listener of this.listeners.get(frame.event) ?? []) listener(frame.payload)
  }

  private settle(frame: WsResponseFrame): void {
    const entry = this.pending.get(frame.id)
    if (!entry) return
    this.pending.delete(frame.id)
    clearTimeout(entry.timer)
    if (frame.ok) entry.resolve(frame.payload)
    else entry.reject(new AgentWsError(frame.error?.message ?? 'rejected', frame.error?.code))
  }

  private rejectAllPending(reason: string): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new AgentWsError(reason))
    }
    this.pending.clear()
  }

  /** Coming back online or to the tab is the only moment we know things changed; retry from zero then. */
  private installNetworkListeners(): void {
    if (this.networkListenersOn || typeof window === 'undefined') return
    window.addEventListener('online', this.handleNetworkWake)
    document.addEventListener('visibilitychange', this.handleNetworkWake)
    this.networkListenersOn = true
  }

  private removeNetworkListeners(): void {
    if (!this.networkListenersOn || typeof window === 'undefined') return
    window.removeEventListener('online', this.handleNetworkWake)
    document.removeEventListener('visibilitychange', this.handleNetworkWake)
    this.networkListenersOn = false
  }

  private readonly handleNetworkWake = (): void => {
    if (this.closedOnPurpose || this.socket || document.visibilityState === 'hidden') return
    this.reconnectAttempts = 0
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    void this.connect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.onStateChange(CONNECTION_STATES.failed)
      return
    }
    const delay = Math.min(BASE_RECONNECT_DELAY * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }
}
