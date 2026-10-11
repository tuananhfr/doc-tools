const { test } = require('node:test')
const assert = require('node:assert/strict')
const { calculateNumerology, normalizeName, reduceMetric } = require('../dist/entertainment/engines/numerology-engine')
const { drawCards, parseDraw } = require('../dist/entertainment/engines/deck-engine')
const { DECKS } = require('../dist/entertainment/data/deck-manifests')
const { sessionKey } = require('../dist/entertainment/entertainment-policy')
const { solarToLunar, lunarToSolar } = require('../dist/entertainment/engines/lunar-engine')
const code = expected => error => error.getResponse().code === expected

test('draft numerology preserves Unicode equivalence and rejects unsupported scripts', () => {
  assert.equal(normalizeName('Đặng Thị Ánh'), 'DANGTHIANH')
  assert.equal(normalizeName('Đặng Thị Ánh'.normalize('NFD')), 'DANGTHIANH')
  for (const value of ['中文', 'Иван', 'ß', 'A🙂']) assert.throws(() => normalizeName(value), code('UNSUPPORTED_NAME'))
  assert.equal(reduceMetric('draft', [11]).value, 11)
  assert.equal(reduceMetric('draft', [22]).value, 22)
  assert.equal(reduceMetric('draft', [33]).value, 33)
  assert.deepEqual(reduceMetric('draft', [99]).steps, [99, 18, 9])
})
test('draft date validation and empty vowel group remain explicit', () => {
  const now = Date.parse('2026-10-11T00:00:00Z')
  const input = { birth_date: '2000-02-29', name: 'LY', personal_year: 2026 }
  const result = calculateNumerology(input, now)
  assert.equal(result.metrics.find(item => item.id === 'soul_urge').value, null)
  assert.equal(result.metrics.find(item => item.id === 'life_path').value, 6)
  assert.equal(calculateNumerology({ ...input, name: '' }, now).metrics.length, 3)
  for (const birth_date of ['1900-02-29', '2027-01-01', '1799-12-31', '2026-04-31']) assert.throws(() => calculateNumerology({ ...input, birth_date }, now), code('INVALID_BIRTH_DATE'))
  assert.throws(() => calculateNumerology({ ...input, name: '---' }, now), code('UNSUPPORTED_NAME'))
})
test('manifests contain 52/78 unique identities and draws never mutate the deck', () => {
  assert.equal(DECKS.cards.length, 52); assert.equal(DECKS.tarot.length, 78)
  for (const kind of ['cards', 'tarot']) {
    assert.equal(new Set(DECKS[kind].map(card => card.id)).size, DECKS[kind].length)
    const before = JSON.stringify(DECKS[kind])
    for (const spread of kind === 'cards' ? [1,3,5,7,9] : [1,3,5,7,10]) {
      for (let index = 0; index < 20; index++) {
        const result = drawCards(kind, { spread, reversed: kind === 'tarot' }, 123)
        assert.equal(new Set(result.cards.map(card => card.id)).size, spread)
        assert.deepEqual(result.cards.map(card => card.position), Array.from({ length: spread }, (_, i) => i + 1))
        if (kind === 'cards') assert.ok(result.cards.every(card => card.orientation === 'UPRIGHT'))
      }
    }
    assert.equal(JSON.stringify(DECKS[kind]), before)
  }
  assert.throws(() => parseDraw('cards', { spread: 10, reversed: false }), code('INVALID_DRAW'))
  assert.throws(() => parseDraw('cards', { spread: 3, reversed: true }), code('INVALID_DRAW'))
  const reversed = drawCards('tarot', { spread: 10, reversed: true }, 123, max => max - 1)
  assert.ok(reversed.cards.every(card => card.orientation === 'REVERSED'))
})
test('expired draw keys cannot become fresh sessions after record cleanup', () => {
  const now = Date.now()
  const key = `${now.toString(36)}_${'a'.repeat(32)}`
  assert.equal(sessionKey(key, now).key, key)
  assert.throws(() => sessionKey(key, now + 3600_001), code('SESSION_EXPIRED'))
  assert.throws(() => sessionKey('ordinary-key', now), code('IDEMPOTENCY_REQUIRED'))
})
test('existing lunar conversion handles leap days, range and round trips', () => {
  for (const date of [{year:2024,month:2,day:10}, {year:2000,month:2,day:29}, {year:2026,month:10,day:11}]) {
    const lunar = solarToLunar(date)
    assert.ok(lunar)
    assert.deepEqual(lunarToSolar(lunar), date)
  }
  assert.deepEqual(solarToLunar({year:2024,month:2,day:10}).day, 1)
  assert.equal(solarToLunar({year:1900,month:2,day:29}), null)
  assert.equal(solarToLunar({year:1799,month:12,day:31}), null)
})
