import { newId } from '@/utils/id'
import type { AiErrorCode, AiResult, AiTask, GuestMessage } from './embed-protocol'

/** One minute past the host's 15-minute poll limit, so the host normally answers `timeout` first. */
export const HOST_AI_TIMEOUT_MS = 16 * 60_000

export class HostAiError extends Error {
  readonly code: AiErrorCode

  constructor(code: AiErrorCode) {
    super(`host AI: ${code}`)
    this.name = 'HostAiError'
    this.code = code
  }
}

export interface HostAiRequest {
  task: AiTask
  text: string
  images?: File[]
}

interface Pending {
  resolve(text: string): void
  reject(error: unknown): void
  timer: ReturnType<typeof setTimeout>
}

/** AI turns answered by the host page (it holds the ERP session; this frame does not). */
export function createHostAi(send: (message: GuestMessage) => void, timeoutMs = HOST_AI_TIMEOUT_MS) {
  const pending = new Map<string, Pending>()

  const take = (id: string): Pending | undefined => {
    const entry = pending.get(id)
    if (entry) {
      clearTimeout(entry.timer)
      pending.delete(id)
    }
    return entry
  }

  function ask(request: HostAiRequest, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) return Promise.reject(signal.reason)
    const id = newId()
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (take(id)) reject(new HostAiError('timeout'))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer })
      signal?.addEventListener('abort', () => {
        if (take(id)) reject(signal.reason)
      }, { once: true })
      send({ type: 'ai-job', payload: { id, task: request.task, text: request.text, images: request.images ?? [] } })
    })
  }

  /** Unknown or late ids are ignored: that turn was replaced, aborted or timed out. */
  function settle(result: AiResult): void {
    const entry = take(result.id)
    if (!entry) return
    if (result.ok) entry.resolve(result.text)
    else entry.reject(new HostAiError(result.error))
  }

  return { ask, settle, pendingCount: () => pending.size }
}
