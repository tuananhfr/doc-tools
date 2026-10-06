const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createPublicKey } = require('node:crypto')
const { checkRuleData, compareRuleData } = require('../dist/rules/rule-kinds')
const { wardsFromCsv } = require('../dist/rules/wards-csv')
const { generateSigningKeys, signRulePackage } = require('../dist/rules/rule-signing')
const { verifyRulePackage } = require('../dist/rules/rule-package')
const { vietnamToday } = require('../dist/rules/rule-dates')

test('the Vietnam date turns over at local midnight', () => {
  assert.equal(vietnamToday(new Date('2026-12-31T16:59:59Z')), '2026-12-31')
  assert.equal(vietnamToday(new Date('2026-12-31T17:00:00Z')), '2027-01-01')
})

test('kind checks catch envelope-valid but wrong data', () => {
  const tiers = [{ upTo: 50, price: 1984 }, { upTo: null, price: 3460 }]
  assert.deepEqual(checkRuleData('electricity', { tiers }).errors, [])
  assert.match(checkRuleData('electricity', { tiers: [{ upTo: 50, price: 1984 }] }).errors.join(), /last tier/)
  assert.match(checkRuleData('electricity', { tiers, vatPercent: 80 }).errors.join(), /vatPercent/)
  assert.deepEqual(checkRuleData('vat', { percent: 8 }).errors, [])
  assert.match(checkRuleData('vat', { percent: 80 }).errors.join(), /percent/)
  assert.match(checkRuleData('payroll', { selfDeduct: 1 }).errors.join(), /minWages/)
  assert.match(checkRuleData('something-new', {}).warnings.join(), /no checks/)
  const ward = { oldProvince: 'Hà Nội', oldDistrict: 'Quận Cầu Giấy', oldWard: 'Phường Dịch Vọng', newProvince: 'Thành phố Hà Nội', newWard: 'Phường Cầu Giấy' }
  const split = checkRuleData('addresses', { wards: [ward, { ...ward, newWard: 'Phường Nghĩa Đô' }, ward] })
  assert.deepEqual(split.errors, [], 'one old ward may map to several new wards')
  assert.match(split.warnings.join(), /1 ward rows repeat/)
  assert.match(split.notes.join(), /1 old wards map to several/)
  assert.match(checkRuleData('addresses', { wards: [ward, { ...ward, oldWard: 'Phường Mai Dịch', newProvince: 'Tỉnh Khác' }] }).errors.join(), /more than one new province/)
})

test('dry run shows bills before and after a tariff change', () => {
  const before = { tiers: [{ upTo: 50, price: 1000 }, { upTo: null, price: 2000 }] }
  const after = { tiers: [{ upTo: 50, price: 1100 }, { upTo: null, price: 2000 }] }
  assert.ok(compareRuleData('electricity', before, after).includes('100 kWh before VAT: 150,000 -> 155,000 VND (+3.3%)'))
  assert.deepEqual(compareRuleData('vat', { percent: 8 }, { percent: 10 }), ['percent: 8 -> 10'])
})

test('ward CSV keeps split wards, drops exact repeats and derives province merges', () => {
  const csv = '﻿tinh_cu,huyen_cu,xa_cu,xa_moi,tinh_moi,ma_xa_moi\r\n'
    + 'Hà Nội,Quận Cầu Giấy,Phường Dịch Vọng,Phường Cầu Giấy,Thành phố Hà Nội,1\r\n'
    + 'Hà Nội,Quận Cầu Giấy,Phường Dịch Vọng,Phường Nghĩa Đô,Thành phố Hà Nội,2\r\n'
    + 'Hà Nội,Quận Cầu Giấy,Phường Dịch Vọng,Phường Nghĩa Đô,Thành phố Hà Nội,2\r\n'
    + 'Bắc Giang,"Thành phố Bắc Giang, cũ",Phường Dĩnh Kế,Phường Bắc Giang,Thành phố Bắc Ninh,3\r\n'
    + 'Bắc Ninh,Thành phố Bắc Ninh,Phường Vũ Ninh,Phường Kinh Bắc,Thành phố Bắc Ninh,4\r\n'
  const { data, duplicatesRemoved } = wardsFromCsv(csv)
  assert.equal(data.wards.length, 4)
  assert.equal(duplicatesRemoved, 1)
  assert.equal(data.wards[2].oldDistrict, 'Thành phố Bắc Giang, cũ')
  assert.deepEqual(data.provinces, [{ name: 'Thành phố Bắc Ninh', old: ['Bắc Giang', 'Bắc Ninh'] }, { name: 'Thành phố Hà Nội', old: ['Hà Nội'] }])
  assert.throws(() => wardsFromCsv('tinh_cu,xa_cu\nA,B\n'), /missing columns: huyen_cu, xa_moi, tinh_moi/)
})

test('signing produces a package the server verifies with the published key', () => {
  const keys = generateSigningKeys()
  const unsigned = { version: 1, kind: 'vat', keyId: 'qa', effectiveFrom: '2027-01-01', publishedAt: '2026-10-06T00:00:00Z', source: { title: 'QA source', url: 'https://example.com/vat', retrievedAt: '2026-10-06T00:00:00Z', sha256: 'c'.repeat(64) }, data: { percent: 10 } }
  const { item, digest } = signRulePackage(unsigned, keys.privatePem)
  assert.equal(verifyRulePackage(item, keys.publicPem).digest, digest)
  assert.equal(createPublicKey({ key: Buffer.from(keys.spkiBase64Url, 'base64url'), format: 'der', type: 'spki' }).export({ format: 'pem', type: 'spki' }), keys.publicPem)
})
