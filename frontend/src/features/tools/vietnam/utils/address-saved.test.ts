import { describe, expect, it } from 'vitest'
import { addressSnapshot, parseAddressSaved } from './address-saved'

describe('address conversion saved state', () => {
  it('keeps the manual table only when it is the one in use', () => {
    const manual = { addresses: 'Phường 1, Quận 3', mappingText: 'a,b', useVerified: false }
    expect(parseAddressSaved(addressSnapshot(manual))).toEqual(manual)
    expect(parseAddressSaved(addressSnapshot({ ...manual, useVerified: true }))).toEqual({ ...manual, mappingText: '', useVerified: true })
    expect(addressSnapshot({ ...manual, addresses: '  \n' })).toBeNull()
  })

  it('refuses payloads it did not write', () => {
    for (const bad of [null, { v: 1, addresses: 'x', mappingText: '' }, { v: 1, addresses: 1, mappingText: '', useVerified: false }, { v: 2, addresses: 'x', mappingText: '', useVerified: false }]) {
      expect(parseAddressSaved(bad)).toBeNull()
    }
  })
})
