import { describe, expect, it } from 'vitest'
import { convertAddress, indexAddressRules, parseAddressMappings, parseAddressRules } from './address-conversion'

const rules = parseAddressRules({
  provinces: [{ name: 'Thành phố Hồ Chí Minh', old: ['Hồ Chí Minh', 'Bình Dương', 'Bà Rịa - Vũng Tàu'] }],
  wards: [
    { oldProvince: 'Hà Nội', oldDistrict: 'Quận Cầu Giấy', oldWard: 'Phường Dịch Vọng', newProvince: 'Thành phố Hà Nội', newWard: 'Phường Cầu Giấy' },
    { oldProvince: 'Hà Nội', oldDistrict: 'Quận Cầu Giấy', oldWard: 'Phường Nghĩa Tân', newProvince: 'Thành phố Hà Nội', newWard: 'Phường Nghĩa Đô' },
    { oldProvince: 'Hà Nội', oldDistrict: 'Quận Cầu Giấy', oldWard: 'Phường Nghĩa Tân', newProvince: 'Thành phố Hà Nội', newWard: 'Phường Cầu Giấy' },
    { oldProvince: 'Hồ Chí Minh', oldDistrict: 'Quận 1', oldWard: 'Phường Bến Nghé', newProvince: 'Thành phố Hồ Chí Minh', newWard: 'Phường Sài Gòn' },
    { oldProvince: 'Bắc Giang', oldDistrict: 'Thành phố Bắc Giang', oldWard: 'Phường Dĩnh Kế', newProvince: 'Thành phố Bắc Ninh', newWard: 'Phường Bắc Giang' },
    { oldProvince: 'Bắc Giang', oldDistrict: 'Huyện Lục Nam', oldWard: 'Xã Tân Lập', newProvince: 'Thành phố Bắc Ninh', newWard: 'Xã Lục Nam' },
    { oldProvince: 'Bắc Giang', oldDistrict: 'Huyện Lục Ngạn', oldWard: 'Xã Tân Lập', newProvince: 'Thành phố Bắc Ninh', newWard: 'Xã Tân Sơn' },
  ],
})!
const index = indexAddressRules(rules)
const convert = (input: string) => convertAddress(input, index)

describe('address conversion', () => {
  it('converts ward and province and drops the district level', () => {
    expect(convert('12 Trần Thái Tông, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội')).toEqual({
      input: '12 Trần Thái Tông, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội', output: '12 Trần Thái Tông, Phường Cầu Giấy, Thành phố Hà Nội', status: 'full', options: [], droppedDistrict: 'Quận Cầu Giấy',
    })
  })
  it('reads abbreviations, unaccented text and prefixes', () => {
    expect(convert('5 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM').output).toBe('5 Lê Lợi, Phường Sài Gòn, Thành phố Hồ Chí Minh')
    expect(convert('phuong ben nghe, quan 1, tp ho chi minh').status).toBe('full')
    expect(convert('P. Dịch Vọng, Cầu Giấy, TP Hà Nội').output).toBe('Phường Cầu Giấy, Thành phố Hà Nội')
  })
  it('finds the province in any segment and keeps text after it', () => {
    expect(convert('Phường Dĩnh Kế, Thành phố Bắc Giang, Bắc Giang, Việt Nam').output).toBe('Phường Bắc Giang, Thành phố Bắc Ninh, Việt Nam')
  })
  it('lists the choices when one old ward was split', () => {
    const result = convert('Phường Nghĩa Tân, Quận Cầu Giấy, Hà Nội')
    expect(result.status).toBe('ambiguous')
    expect(result.options).toEqual(['Phường Nghĩa Đô', 'Phường Cầu Giấy'])
    expect(result.output).toBe('Phường Nghĩa Tân, Thành phố Hà Nội')
  })
  it('uses the district to tell same-name wards apart', () => {
    expect(convert('Xã Tân Lập, Huyện Lục Ngạn, Bắc Giang').output).toBe('Xã Tân Sơn, Thành phố Bắc Ninh')
    expect(convert('Xã Tân Lập, Bắc Giang').status).toBe('ambiguous')
  })
  it('changes only the province when the ward is unknown', () => {
    expect(convert('Xã Không Có, Huyện Lục Nam, Bắc Giang')).toMatchObject({ status: 'province', output: 'Xã Không Có, Thành phố Bắc Ninh' })
    expect(convert('Thủ Dầu Một, Bình Dương')).toMatchObject({ status: 'province', output: 'Thủ Dầu Một, Thành phố Hồ Chí Minh' })
    expect(convert('Vũng Tàu').output).toBe('Thành phố Hồ Chí Minh')
  })
  it('leaves the address alone when no province is recognised', () => {
    expect(convert('12 Lê Lợi, Phường A, Quận B, Tỉnh Z')).toMatchObject({ status: 'none', output: '12 Lê Lợi, Phường A, Quận B, Tỉnh Z' })
  })
  it('accepts split wards, drops exact repeats and rejects conflicting provinces', () => {
    const manual = parseAddressMappings('Tỉnh A|Huyện B|Xã C|Tỉnh D|Phường E\nTỉnh A|Huyện B|Xã C|Tỉnh D|Phường F\nTỉnh A|Huyện B|Xã C|Tỉnh D|Phường E')!
    expect(manual.wards).toHaveLength(2)
    expect(convertAddress('Xã C, Huyện B, Tỉnh A', indexAddressRules(manual)).status).toBe('ambiguous')
    expect(parseAddressMappings('A|B|C|D')).toBeNull()
    expect(parseAddressMappings('Tỉnh A|B|C|Tỉnh D|E\nTỉnh A|B|G|Tỉnh K|H')).toBeNull()
    expect(parseAddressMappings('')).toEqual({ provinces: [], wards: [] })
    expect(parseAddressRules({})).toBeNull()
  })
})
