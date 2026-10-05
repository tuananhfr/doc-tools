import { describe, expect, it } from 'vitest'
import vectors from './normalization_vectors_v1.json'
import tables from './normalization_tables_v1.json'
import {
  NORMALIZATION_VERSION,
  cleanQuery,
  companyKey,
  maskIdentifier,
  normalizeBusinessCode,
  normalizeEmail,
  normalizeMaterial,
  normalizePhone,
  normalizeTaxCode,
  normalizeText,
  normalizeUnit,
  searchKey,
  taxCodeChecksumValid,
} from './index'

/*
 * Bộ vector DÙNG CHUNG với bản PHP (erpcons_dcp_normalize/scripts/check-vectors.php).
 * Ca nào đỏ ở đây mà xanh bên kia (hoặc ngược lại) là hai bản đã lệch — lỗi SEV2
 * theo đặc tả 17, không phải "test cần sửa".
 */
const groups = vectors.groups

describe('vn-normalize — phiên bản', () => {
  it('bảng và vector cùng một normalization_version', () => {
    expect(vectors.normalization_version).toBe(NORMALIZATION_VERSION)
    expect(tables.normalization_version).toBe(NORMALIZATION_VERSION)
  })

  it('đủ ≥ 300 vector như đặc tả yêu cầu', () => {
    const total = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0)
    expect(total).toBeGreaterThanOrEqual(300)
  })
})

describe('vn-normalize — vector', () => {
  it.each(groups.text.map((row) => [row.id, row.input, row.expected]))('%s normalizeText', (_id, input, expected) => {
    expect(normalizeText(input)).toBe(expected)
  })

  it.each(groups.search_key.map((row) => [row.id, row.input, row.expected]))('%s searchKey', (_id, input, expected) => {
    expect(searchKey(input)).toBe(expected)
  })

  it.each(groups.company.map((row) => [row.id, row.input, row.expected]))('%s companyKey', (_id, input, expected) => {
    const result = companyKey(input)
    expect({ legalForm: result.legalForm, core: result.core }).toEqual(expected)
  })

  it.each(groups.phone.map((row) => [row.id, row.input, row.expected]))('%s normalizePhone', (_id, input, expected) => {
    const { e164, kind, valid, legacy, aliases } = normalizePhone(input)
    expect({ e164, kind, valid, legacy, aliases }).toEqual(expected)
  })

  it.each(groups.tax_code.map((row) => [row.id, row.input, row.expected]))('%s normalizeTaxCode', (_id, input, expected) => {
    const { canonical, kind, valid, checksumValid, headOffice } = normalizeTaxCode(input)
    expect({ canonical, kind, valid, checksumValid, headOffice }).toEqual(expected)
  })

  it.each(groups.email.map((row) => [row.id, row.input, row.expected]))('%s normalizeEmail', (_id, input, expected) => {
    const { email, valid, generic } = normalizeEmail(input)
    expect({ email, valid, generic }).toEqual(expected)
  })

  it.each(groups.business_code.map((row) => [row.id, row.input, row.separator, row.expected]))(
    '%s normalizeBusinessCode',
    (_id, input, separator, expected) => {
      expect(normalizeBusinessCode(input, separator ?? undefined)).toBe(expected)
    },
  )

  it.each(groups.material.map((row) => [row.id, row.input, row.brands, row.expected]))(
    '%s normalizeMaterial',
    (_id, input, brands, expected) => {
      expect(normalizeMaterial(input, brands as Record<string, string>)).toBe(expected)
    },
  )

  it.each(groups.unit.map((row) => [row.id, row.input, row.expected]))('%s normalizeUnit', (_id, input, expected) => {
    expect(normalizeUnit(input)).toEqual(expected)
  })
})

describe('vn-normalize — ca vàng của tài liệu 13 (VN-01…VN-13)', () => {
  it('VN-01/02/03: dấu kiểu cũ/mới, NFD/NFC, Đ/đ/d về cùng khoá', () => {
    expect(searchKey('hoà phát')).toBe(searchKey('hòa phát'))
    expect(normalizeText('hoà phát')).toBe(normalizeText('hòa phát'))
    expect(normalizeText('hòa'.normalize('NFD'))).toBe(normalizeText('hòa'))
    expect(new Set([searchKey('Đức'), searchKey('duc'), searchKey('ĐỨC')]).size).toBe(1)
  })

  it('VN-05: số 11 số cũ và số 10 số mới cùng E.164', () => {
    expect(normalizePhone('01681234567').e164).toBe(normalizePhone('0381234567').e164)
  })

  it('VN-06: trụ sở và chi nhánh KHÔNG cùng mã nhưng cùng trụ sở', () => {
    const head = normalizeTaxCode('0100109106')
    const branch = normalizeTaxCode('0100109106-001')
    expect(head.canonical).not.toBe(branch.canonical)
    expect(branch.headOffice).toBe(head.canonical)
  })

  it('VN-09/10: cùng loại hình thì cùng khoá; khác loại hình thì khác khoá, cùng phần tên', () => {
    const keys = ['CTCP ABC', 'Công ty Cổ phần ABC', 'ABC JSC'].map((name) => companyKey(name).key)
    expect(new Set(keys).size).toBe(1)
    const llc = companyKey('Cty TNHH ABC')
    expect(llc.key).not.toBe(keys[0])
    expect(llc.core).toBe(companyKey('CTCP ABC').core)
  })

  it('VN-11/12: đường kính và đơn vị', () => {
    expect(new Set(['D16', 'Ø16', 'phi 16', 'fi16'].map((v) => normalizeMaterial(v))).size).toBe(1)
    expect(new Set(['m3', 'm³', 'khối'].map((v) => normalizeUnit(v)?.code)).size).toBe(1)
    expect(normalizeUnit('tấn')).toEqual({ code: 't', base: 'kg', factor: 1000 })
  })

  it('VN-13: ký tự vô hình và homoglyph Latin–Cyrillic bị loại / quy đổi', () => {
    expect(searchKey('Hоà\u{200b}Phát')).toBe('hoaphat')
  })
})

describe('vn-normalize — hàm phụ', () => {
  it('cleanQuery không đổi hoa thường, không bỏ dấu', () => {
    expect(cleanQuery('  Trần\u{200b}  Văn ')).toBe('Trần Văn')
  })

  it('checksum MST: mã thật của Viettel đúng, đổi một chữ số là sai', () => {
    expect(taxCodeChecksumValid('0100109106')).toBe(true)
    expect(taxCodeChecksumValid('0100109107')).toBe(false)
  })

  it('che số định danh chỉ chừa 4 số cuối', () => {
    expect(maskIdentifier('001090012345')).toBe('********2345')
  })
})
