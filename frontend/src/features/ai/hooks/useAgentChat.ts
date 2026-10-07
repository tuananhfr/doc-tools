import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentWsClient } from '../services/ws-client'
import { AGENT_EVENT, AGENT_EVENT_TYPES, WS_METHODS, type AgentEventPayload } from '../services/ws-protocol'
import type { ChatMessage, ChatSessionSummary } from '../types/ai.types'
import { belongsToAgent, buildSessionKey, stripInternalDirectives, toChatMessages, toSessionSummaries } from '../utils/chat-text'

/** Only the open session key is stored; the conversation itself stays in GoClaw. */
const OPEN_SESSION_STORAGE_KEY = 'cn.ai.session'

let messageSeq = 0
const nextId = () => `m${++messageSeq}`

function readStoredKey() {
  try { return localStorage.getItem(OPEN_SESSION_STORAGE_KEY) ?? '' } catch { return '' }
}

const settle = (messages: ChatMessage[]) => messages.map((message) => (message.streaming ? { ...message, streaming: false } : message))

/**
 * Chat on top of `AgentWsClient`, ported from ERPCons `useAssistantChat`. Three rules hold it together:
 * - the client names a new session BEFORE sending (see `buildSessionKey`);
 * - `sessions.preview` is the source of truth after every turn (chunks are raw model text);
 * - after F5 the order is fixed: listen and buffer chunks -> fetch history -> append the buffer ->
 *   ask whether the session is still running. Fetching history first leaves a silent hole mid-reply,
 *   because GoClaw keeps streaming a run to the user while the new tab is still loading.
 */
export function useAgentChat(client: AgentWsClient, connected: boolean) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [sessionKey, setSessionKey] = useState(readStoredKey)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [failed, setFailed] = useState(false)

  const bufferRef = useRef('')
  const historyReadyRef = useRef(false)
  const sessionKeyRef = useRef(sessionKey)

  useEffect(() => { sessionKeyRef.current = sessionKey }, [sessionKey])
  useEffect(() => {
    try {
      if (sessionKey) localStorage.setItem(OPEN_SESSION_STORAGE_KEY, sessionKey)
      else localStorage.removeItem(OPEN_SESSION_STORAGE_KEY)
    } catch {
      // Storage blocked: chat still works, a reload just starts a new conversation.
    }
  }, [sessionKey])

  const syncFromServer = useCallback(async (key: string) => {
    if (!key) return
    try {
      const payload = await client.call<{ messages?: unknown }>(WS_METHODS.sessionsPreview, { key })
      const rebuilt = toChatMessages(payload?.messages, nextId)
      if (rebuilt.length) { setMessages(rebuilt); return }
    } catch {
      // Keep what streamed in; it is still readable.
    }
    setMessages(settle)
  }, [client])

  const appendChunk = useCallback((chunk: string) => {
    const cleaned = stripInternalDirectives(chunk)
    if (!cleaned) return
    setMessages((previous) => {
      const last = previous[previous.length - 1]
      if (last?.role === 'assistant' && last.streaming) return [...previous.slice(0, -1), { ...last, content: last.content + cleaned }]
      return [...previous, { id: nextId(), role: 'assistant', content: cleaned, streaming: true }]
    })
  }, [])

  useEffect(() => client.on(AGENT_EVENT, (raw) => {
    const event = (raw ?? {}) as AgentEventPayload
    if (event.channel && event.channel !== 'ws' && !event.runKind) return
    if (event.sessionKey && event.sessionKey !== sessionKeyRef.current) return
    switch (event.type) {
      case AGENT_EVENT_TYPES.runStarted:
        setStreaming(true)
        return
      case AGENT_EVENT_TYPES.chunk: {
        const chunk = String(event.payload?.content ?? '')
        if (!chunk) return
        if (!historyReadyRef.current) { bufferRef.current += chunk; return }
        setStreaming(true)
        appendChunk(chunk)
        return
      }
      case AGENT_EVENT_TYPES.runCompleted:
      case AGENT_EVENT_TYPES.runFailed:
      case AGENT_EVENT_TYPES.runCancelled:
        // The real end of a turn: `chat.send` may never return if the socket dropped meanwhile.
        setStreaming(false)
        setMessages(settle)
        void syncFromServer(sessionKeyRef.current)
        return
      default:
    }
  }), [client, appendChunk, syncFromServer])

  const refreshSessions = useCallback(async () => {
    if (!connected) return
    try {
      const payload = await client.call<{ sessions?: unknown }>(WS_METHODS.sessionsList, { agentId: client.agentKey, limit: 30 })
      setSessions(toSessionSummaries(payload?.sessions))
    } catch {
      // A broken list must not take the chat down with it.
    }
  }, [client, connected])

  const openSession = useCallback(async (key: string) => {
    historyReadyRef.current = false
    bufferRef.current = ''
    sessionKeyRef.current = key
    setSessionKey(key)
    setMessages([])
    setStreaming(false)
    setFailed(false)
    if (!key || !connected) { historyReadyRef.current = true; return }
    setLoadingHistory(true)
    try {
      const payload = await client.call<{ messages?: unknown }>(WS_METHODS.sessionsPreview, { key })
      const history = toChatMessages(payload?.messages, nextId)
      const buffered = bufferRef.current
      bufferRef.current = ''
      historyReadyRef.current = true
      setMessages(buffered ? [...history, { id: nextId(), role: 'assistant', content: stripInternalDirectives(buffered), streaming: true }] : history)
      const status = await client.call<{ isRunning?: boolean }>(WS_METHODS.chatSessionStatus, { sessionKey: key })
      if (status?.isRunning) setStreaming(true)
    } catch {
      historyReadyRef.current = true
      setFailed(true)
    } finally {
      setLoadingHistory(false)
    }
  }, [client, connected])

  // On (re)connect: list sessions and reopen the one from before the reload, if it is this agent's.
  useEffect(() => {
    if (!connected) return
    void Promise.resolve().then(async () => {
      await refreshSessions()
      const stored = sessionKeyRef.current
      await openSession(belongsToAgent(stored, client.agentKey) ? stored : '')
    })
    // Runs on connection changes only; openSession changes with every session switch.
  }, [connected])

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || !connected) return
    setFailed(false)
    setMessages((previous) => [...previous, { id: nextId(), role: 'user', content }])
    setStreaming(true)
    historyReadyRef.current = true
    let key = sessionKeyRef.current
    const isNew = key === ''
    if (isNew) {
      key = buildSessionKey(client.agentKey)
      sessionKeyRef.current = key
      setSessionKey(key)
    }
    try {
      // Without `stream: true` GoClaw calls the provider's non-streaming API and sends one chunk at the end.
      await client.call(WS_METHODS.chatSend, { agentId: client.agentKey, sessionKey: key, message: content, stream: true })
      setStreaming(false)
      await syncFromServer(key)
      if (isNew) void refreshSessions()
    } catch {
      setStreaming(false)
      // A failed call does not mean a failed run: ask the server before reporting anything.
      await syncFromServer(sessionKeyRef.current)
      setFailed(true)
    }
  }, [client, connected, refreshSessions, syncFromServer])

  const abort = useCallback(async () => {
    if (!sessionKeyRef.current) return
    try { await client.call(WS_METHODS.chatAbort, { sessionKey: sessionKeyRef.current }) } finally {
      setStreaming(false)
      setMessages(settle)
    }
  }, [client])

  const startNewSession = useCallback(() => { void openSession('') }, [openSession])

  return { sessions, sessionKey, messages, streaming, loadingHistory, failed, send, abort, openSession, startNewSession, refreshSessions }
}

export type AgentChat = ReturnType<typeof useAgentChat>
