import { configuration } from '../config/configuration'
import { GoclawError } from './goclaw.client'

type Pending = { resolve: (payload: unknown) => void; reject: (error: Error) => void }

/**
 * Writes agent context files. GoClaw has no HTTP setter for AGENTS.md / IDENTITY.md, only the
 * WS method `agents.files.set`, so this opens one admin socket per call and closes it after.
 */
export async function writeAgentFiles(agentKey: string, files: { name: string; content: string }[], timeoutMs = 20000) {
  const { url, gatewayToken } = configuration().goclaw
  if (!url || !gatewayToken) throw new GoclawError('GoClaw is not configured', 503)
  const socket = new WebSocket(`${url.replace(/\/+$/, '').replace(/^http/, 'ws')}/ws`)
  const pending = new Map<string, Pending>()
  let seq = 0
  const fail = (error: Error) => { for (const entry of pending.values()) entry.reject(error); pending.clear() }
  const timer = setTimeout(() => { fail(new GoclawError('GoClaw WS timed out', 504)); socket.close() }, timeoutMs)

  socket.addEventListener('message', (event) => {
    let frame: { type?: string; id?: string; ok?: boolean; payload?: unknown; error?: { message?: string } }
    try { frame = JSON.parse(String(event.data)) } catch { return }
    if (frame.type !== 'res' || !frame.id) return
    const entry = pending.get(frame.id)
    if (!entry) return
    pending.delete(frame.id)
    if (frame.ok) entry.resolve(frame.payload)
    else entry.reject(new GoclawError(frame.error?.message ?? 'GoClaw rejected the request', 502))
  })
  socket.addEventListener('close', () => fail(new GoclawError('GoClaw WS closed', 502)))

  const call = (method: string, params: unknown) => new Promise<unknown>((resolve, reject) => {
    const id = String(++seq)
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ type: 'req', id, method, params }))
  })

  try {
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new GoclawError('GoClaw WS unreachable', 503)), { once: true })
    })
    await call('connect', { token: gatewayToken, user_id: 'system', locale: 'vi' })
    // Sequential on purpose: each write invalidates the agent cache, parallel writes race it.
    for (const file of files) await call('agents.files.set', { agentId: agentKey, name: file.name, content: file.content, propagate: false })
  } finally {
    clearTimeout(timer)
    socket.close()
  }
}
