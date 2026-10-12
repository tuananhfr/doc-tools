import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDynamicCode, revokeDynamicCode } from '../services/dynamic-codes.api'
import { CODE_STORE, parseCodeReceipt, readCodeReceipts, writeCodeReceipts } from './dynamic-codes'
const receipt = { version: 1 as const, id: '11111111-1111-4111-8111-111111111111', resolve_url: 'https://example.com/api/v1/codes/' + 'a'.repeat(32) + '/resolve', manage_key: 'b'.repeat(43), expires_at: null, destination_url: 'https://example.com/asset', revoked: false }
afterEach(() => vi.unstubAllGlobals())
describe('dynamic QR credential isolation', () => {
  it('rejects invalid receipts and does not infer opt-in or write while reading', () => {
    const storage = { getItem: vi.fn().mockReturnValue(JSON.stringify([receipt])), setItem: vi.fn(), removeItem: vi.fn() }
    expect(readCodeReceipts(storage)).toEqual([receipt]); expect(storage.setItem).not.toHaveBeenCalled()
    expect(parseCodeReceipt({ ...receipt, resolve_url: receipt.resolve_url + '?manage_key=' + receipt.manage_key })).toBeNull()
    expect(parseCodeReceipt({ ...receipt, manage_key: 'bad' })).toBeNull()
    writeCodeReceipts(storage, []); expect(storage.removeItem).toHaveBeenCalledWith(CODE_STORE)
  })
  it('creation sends only destination/expiry without account credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, ...receipt }) }); vi.stubGlobal('fetch', fetcher)
    const created = await createDynamicCode(receipt.destination_url, null)
    expect(created.resolve_url).not.toContain(created.manage_key)
    const request = fetcher.mock.calls[0][1]
    expect(request).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { 'X-CN-Request': '1' } })
    expect(JSON.parse(request.body)).toEqual({ destination_url: receipt.destination_url, expires_at: null })
  })
  it('revocation sends its secret only in the trusted request body', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, revoked: true }) }); vi.stubGlobal('fetch', fetcher)
    await revokeDynamicCode(receipt)
    const [url, request] = fetcher.mock.calls[0]
    expect(url).not.toContain(receipt.manage_key); expect(JSON.parse(request.body)).toEqual({ manage_key: receipt.manage_key })
  })
})
