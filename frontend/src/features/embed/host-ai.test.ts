import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GuestMessage } from './embed-protocol'
import { createHostAi, HostAiError } from './host-ai'

function setup(timeoutMs?: number) {
  const sent: GuestMessage[] = []
  const ai = createHostAi((message) => sent.push(message), timeoutMs)
  const lastId = () => {
    const message = sent.at(-1)
    if (message?.type !== 'ai-job') throw new Error('no ai-job sent')
    return message.payload.id
  }
  return { ai, sent, lastId }
}

const isAbort = (error: unknown) => (error as Error).name === 'AbortError'

afterEach(() => {
  vi.useRealTimers()
})

describe('createHostAi', () => {
  it('sends an ai-job and resolves with the matching result', async () => {
    const { ai, sent, lastId } = setup()
    const answer = ai.ask({ task: 'ask', text: 'Q' })
    expect(sent[0]).toMatchObject({ type: 'ai-job', payload: { task: 'ask', text: 'Q', images: [] } })
    ai.settle({ id: lastId(), ok: true, text: 'A' })
    await expect(answer).resolves.toBe('A')
    expect(ai.pendingCount()).toBe(0)
  })

  it('rejects with the host error code', async () => {
    const { ai, lastId } = setup()
    const answer = ai.ask({ task: 'check_payroll', text: 'R' })
    ai.settle({ id: lastId(), ok: false, error: 'rate-limited' })
    await expect(answer).rejects.toMatchObject({ name: 'HostAiError', code: 'rate-limited' })
  })

  it('ignores unknown and repeated results', async () => {
    const { ai, lastId } = setup()
    const answer = ai.ask({ task: 'ask', text: 'Q' })
    ai.settle({ id: 'someone-else', ok: true, text: 'X' })
    expect(ai.pendingCount()).toBe(1)
    const id = lastId()
    ai.settle({ id, ok: true, text: 'A' })
    ai.settle({ id, ok: false, error: 'failed' })
    await expect(answer).resolves.toBe('A')
  })

  it('stops waiting when the caller aborts; a late result is dropped', async () => {
    const { ai, lastId } = setup()
    const controller = new AbortController()
    const answer = ai.ask({ task: 'ask', text: 'Q' }, controller.signal)
    controller.abort()
    await expect(answer).rejects.toSatisfy(isAbort)
    expect(ai.pendingCount()).toBe(0)
    expect(() => ai.settle({ id: lastId(), ok: true, text: 'late' })).not.toThrow()
  })

  it('does not send anything when already aborted', async () => {
    const { ai, sent } = setup()
    const controller = new AbortController()
    controller.abort()
    await expect(ai.ask({ task: 'ask', text: 'Q' }, controller.signal)).rejects.toSatisfy(isAbort)
    expect(sent).toHaveLength(0)
  })

  it('times out with code timeout', async () => {
    vi.useFakeTimers()
    const { ai } = setup(1000)
    const answer = ai.ask({ task: 'ask', text: 'Q' })
    const check = expect(answer).rejects.toBeInstanceOf(HostAiError)
    vi.advanceTimersByTime(1000)
    await check
    await expect(answer).rejects.toMatchObject({ code: 'timeout' })
    expect(ai.pendingCount()).toBe(0)
  })
})
