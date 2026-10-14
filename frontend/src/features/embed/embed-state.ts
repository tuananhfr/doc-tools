'use client'
import { useSyncExternalStore } from 'react'
import { appConfig } from '@/config/app.config'
import { useAppStore } from '@/store/app.store'
import { wrap, type EmbedCapability, type GuestMessage } from './embed-protocol'
import { EMBED_HOST_ID, EMBED_STORAGE_KEY, EMBED_THEME_PARAM, resolveEmbedHost } from './embed-mode'
import { createHostAi } from './host-ai'

export interface EmbedState {
  host: string | null
  capabilities: EmbedCapability[]
}

const SERVER_STATE: EmbedState = { host: null, capabilities: [] }
let state: EmbedState = SERVER_STATE
const listeners = new Set<() => void>()

export function getEmbedState(): EmbedState {
  return state
}

export function setEmbedState(next: Partial<EmbedState>): void {
  state = { ...state, ...next }
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useEmbed(): EmbedState {
  return useSyncExternalStore(subscribe, getEmbedState, () => SERVER_STATE)
}

export function postToHost(message: GuestMessage): void {
  if (state.host) window.parent.postMessage(wrap(message), state.host)
}

export const hostAi = createHostAi(postToHost)

const dirtySources = new Set<string>()

/** Any mounted ToolLeaveGuard holding unsaved work makes the whole frame dirty. */
export function setDirtySource(id: string, active: boolean): void {
  const before = dirtySources.size > 0
  if (active) dirtySources.add(id)
  else dirtySources.delete(id)
  const after = dirtySources.size > 0
  if (before !== after) postToHost({ type: 'dirty', payload: { value: after } })
}

function readStored(): string | null {
  try {
    return sessionStorage.getItem(EMBED_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(host: string | null): void {
  try {
    if (host) sessionStorage.setItem(EMBED_STORAGE_KEY, host)
    else sessionStorage.removeItem(EMBED_STORAGE_KEY)
  } catch {
    // Blocked storage only costs embed mode after an in-frame reload.
  }
}

let initialised = false

/** Client-only, once: decides embed mode for this document. */
export function initEmbed(): void {
  if (initialised || typeof window === 'undefined') return
  initialised = true
  const host = resolveEmbedHost({
    search: location.search,
    framed: window.parent !== window,
    ancestorOrigin: location.ancestorOrigins?.[0] ?? null,
    referrer: document.referrer,
    stored: readStored(),
    hosts: appConfig.embedHosts,
    selfOrigin: location.origin,
  })
  writeStored(host)
  if (!host) {
    delete document.documentElement.dataset.embed
    return
  }
  document.documentElement.dataset.embed = EMBED_HOST_ID
  const theme = new URLSearchParams(location.search).get(EMBED_THEME_PARAM)
  if (theme === 'light' || theme === 'dark' || theme === 'field') useAppStore.getState().setTheme(theme)
  setEmbedState({ host })
}
