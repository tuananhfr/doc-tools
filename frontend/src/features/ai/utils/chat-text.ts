import type { ChatMessage, ChatSessionSummary } from '../types/ai.types'
import { toChatMedia } from './attachments'

/** Version 4 UUID from getRandomValues: `crypto.randomUUID` is missing outside secure contexts (plain-http LAN). */
export function randomUuid(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  const bytes = random(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * The client names a new session before sending: `chat.send` does not return the key, and events
 * are filtered by it, so a server-chosen key would drop every chunk of the first reply.
 * The shape must match GoClaw's `sessions.BuildWSSessionKey`, which parses the agent back out of it.
 */
export const buildSessionKey = (agentKey: string, id = randomUuid()) => `agent:${agentKey}:ws:direct:${id}`

/** localStorage is per origin, not per account: a key left by another account opens an empty chat. */
export const belongsToAgent = (sessionKey: string, agentKey: string) => sessionKey !== '' && agentKey !== '' && sessionKey.startsWith(`agent:${agentKey}:`)

/** Streamed chunks are raw model output; GoClaw strips these lines only when it saves the turn. */
export function stripInternalDirectives(text: string): string {
  return text.split('\n').filter((line) => !/MEDIA:\S+/.test(line) && !line.trim().startsWith('[[audio_as_voice]]')).join('\n')
}

interface RawHistoryMessage { role?: unknown; content?: unknown; media_refs?: unknown; createdAt?: unknown; created_at?: unknown }
interface RawSession { key?: unknown; label?: unknown; messageCount?: unknown; updated?: unknown }

export function toChatMessages(raw: unknown, nextId: () => string, filesUrl = ''): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return (raw as RawHistoryMessage[])
    .filter((message) => (message?.role === 'user' || message?.role === 'assistant') && String(message.content ?? '') !== '')
    .map((message) => {
      const media = toChatMedia(message.media_refs, filesUrl)
      return {
        id: nextId(),
        role: message.role as ChatMessage['role'],
        content: String(message.content),
        ...(media.length ? { media } : {}),
        createdAt: typeof message.createdAt === 'string' ? message.createdAt : typeof message.created_at === 'string' ? message.created_at : undefined,
      }
    })
}

/** Labels are cut from the first message, so they can hold media tags and the start of a file block. */
function sessionLabel(raw: string) {
  return raw.split('```')[0].replace(/<media:[a-z]+\b[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/** GoClaw's `store.SessionInfo`: the timestamp is `updated`, and there is no preview text. */
export function toSessionSummaries(raw: unknown): ChatSessionSummary[] {
  if (!Array.isArray(raw)) return []
  return (raw as RawSession[])
    .map((session) => ({ key: String(session?.key ?? ''), label: sessionLabel(String(session?.label ?? '')), messageCount: Number(session?.messageCount ?? 0), updatedAt: typeof session?.updated === 'string' ? session.updated : undefined }))
    .filter((session) => session.key !== '')
}

export type MessagePart = { kind: 'text'; text: string } | { kind: 'code'; lang: string; text: string }

/** Splits a reply into prose and fenced blocks; an unclosed fence (still streaming) stays prose. */
export function splitFences(content: string): MessagePart[] {
  const parts: MessagePart[] = []
  const pattern = /^```([\w-]*)[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm
  let last = 0
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) parts.push({ kind: 'text', text: content.slice(last, start) })
    parts.push({ kind: 'code', lang: match[1].toLowerCase(), text: match[2] })
    last = start + match[0].length
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) })
  return parts.filter((part) => part.kind === 'code' || part.text.trim() !== '')
}

export type InlinePart = { kind: 'text'; text: string } | { kind: 'link'; href: string; text: string } | { kind: 'strong'; text: string } | { kind: 'code'; text: string }

/**
 * The few inline marks models use all the time, rendered as React nodes (never HTML): **bold**,
 * `code`, [label](https://…) and bare https links. Only http(s) URLs become links.
 */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const pattern = /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) })
    if (match[1] !== undefined) parts.push({ kind: 'strong', text: match[1] })
    else if (match[2] !== undefined) parts.push({ kind: 'code', text: match[2] })
    else if (match[3] !== undefined) parts.push({ kind: 'link', href: match[4], text: match[3] })
    else parts.push({ kind: 'link', href: match[5], text: match[5] })
    last = start + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) })
  return parts
}
