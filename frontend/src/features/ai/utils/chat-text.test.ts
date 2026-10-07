import { describe, expect, it } from 'vitest'
import { belongsToAgent, buildSessionKey, inlineParts, randomUuid, splitFences, stripInternalDirectives, toChatMessages, toSessionSummaries } from './chat-text'
import { parseCnAction } from './cn-action'

describe('session keys', () => {
  it('builds GoClaw ws session keys and recognises only the current agent', () => {
    const key = buildSessionKey('cn-abc', '11111111-2222-4333-8444-555555555555')
    expect(key).toBe('agent:cn-abc:ws:direct:11111111-2222-4333-8444-555555555555')
    expect(belongsToAgent(key, 'cn-abc')).toBe(true)
    expect(belongsToAgent(key, 'cn-ab')).toBe(false)
    expect(belongsToAgent('', 'cn-abc')).toBe(false)
  })

  it('makes version 4 UUIDs without crypto.randomUUID', () => {
    const id = randomUuid((bytes) => bytes.fill(255))
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
    expect(randomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('chat text', () => {
  it('drops internal media directives from streamed chunks', () => {
    expect(stripInternalDirectives('Here\nMEDIA:/app/workspace/a.png\n[[audio_as_voice]]\nDone')).toBe('Here\nDone')
  })

  it('keeps user and assistant history only', () => {
    let n = 0
    const messages = toChatMessages([{ role: 'user', content: 'hi' }, { role: 'tool', content: 'x' }, { role: 'assistant', content: '' }, { role: 'assistant', content: 'ok', created_at: '2026-10-08' }], () => `m${++n}`)
    expect(messages).toEqual([{ id: 'm1', role: 'user', content: 'hi', createdAt: undefined }, { id: 'm2', role: 'assistant', content: 'ok', createdAt: '2026-10-08' }])
    expect(toChatMessages(null, () => 'x')).toEqual([])
    expect(toSessionSummaries([{ key: 'k', label: 'L', messageCount: 3, updated: 't' }, { label: 'no key' }])).toEqual([{ key: 'k', label: 'L', messageCount: 3, updatedAt: 't' }])
  })

  it('splits closed fences and leaves an unfinished one as text', () => {
    expect(splitFences('Mở công cụ:\n```cn-action\n{"type":"open-tool","slug":"nen-pdf"}\n```\nXong.')).toEqual([
      { kind: 'text', text: 'Mở công cụ:\n' },
      { kind: 'code', lang: 'cn-action', text: '{"type":"open-tool","slug":"nen-pdf"}' },
      { kind: 'text', text: '\nXong.' },
    ])
    expect(splitFences('a\n```cn-action\n{"type"')).toEqual([{ kind: 'text', text: 'a\n```cn-action\n{"type"' }])
  })

  it('renders only safe inline marks', () => {
    expect(inlineParts('**Đậm** và `mã` [nguồn](https://chinhphu.vn/a) https://lpc.vn/x. javascript:alert(1)')).toEqual([
      { kind: 'strong', text: 'Đậm' }, { kind: 'text', text: ' và ' }, { kind: 'code', text: 'mã' }, { kind: 'text', text: ' ' },
      { kind: 'link', href: 'https://chinhphu.vn/a', text: 'nguồn' }, { kind: 'text', text: ' ' }, { kind: 'link', href: 'https://lpc.vn/x', text: 'https://lpc.vn/x' },
      { kind: 'text', text: '. javascript:alert(1)' },
    ])
    expect(inlineParts('[x](javascript:alert(1))')).toEqual([{ kind: 'text', text: '[x](javascript:alert(1))' }])
  })
})

describe('cn-action', () => {
  it('accepts the open-tool shape only', () => {
    expect(parseCnAction('{"type":"open-tool","slug":"nen-pdf"}')).toEqual({ type: 'open-tool', slug: 'nen-pdf', params: {} })
    expect(parseCnAction('{"type":"open-tool","slug":"nen-pdf","params":{"level":"strong"}}')).toEqual({ type: 'open-tool', slug: 'nen-pdf', params: { level: 'strong' } })
    for (const bad of ['', 'nope', '[]', '{"type":"run","slug":"nen-pdf"}', '{"type":"open-tool","slug":"../admin"}', '{"type":"open-tool","slug":"Nen"}',
      '{"type":"open-tool","slug":"x","params":{"a b":"1"}}', '{"type":"open-tool","slug":"x","params":{"a":1}}', '{"type":"open-tool","slug":"x","params":[]}',
      `{"type":"open-tool","slug":"x","params":{"a":"${'z'.repeat(201)}"}}`, '{"type":"open-tool","slug":"x","params":{"a":"1","b":"1","c":"1","d":"1","e":"1","f":"1"}}']) {
      expect(parseCnAction(bad), bad).toBeNull()
    }
  })
})
