import { describe, expect, it } from 'vitest'
import { convertAddress, parseAddressMappings } from './address-conversion'

describe('address conversion', () => {
  it('converts only an exact structured mapping', () => {
    const mappings = parseAddressMappings('Tỉnh A|Huyện B|Xã C|Tỉnh D|Phường E')!
    expect(convertAddress('12 Lê Lợi, Xã C, Huyện B, Tỉnh A', mappings)).toEqual({ input: '12 Lê Lợi, Xã C, Huyện B, Tỉnh A', output: '12 Lê Lợi, Phường E, Tỉnh D', status: 'matched' })
    expect(convertAddress('12 Lê Lợi, Xã C, Huyện X, Tỉnh A', mappings).status).toBe('unmatched')
  })
  it('rejects duplicate and incomplete mapping sets', () => {
    expect(parseAddressMappings('A|B|C|D')).toBeNull()
    expect(parseAddressMappings('A|B|C|D|E\nA|B|C|F|G')).toBeNull()
  })
})
