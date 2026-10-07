export const normalizeOcrText = text => text.normalize('NFC').replace(/\s+/gu, ' ').trim()

export function editDistance(reference, actual) {
  let previous = Array.from({ length: actual.length + 1 }, (_, i) => i)
  for (let i = 0; i < reference.length; i++) {
    const current = [i + 1]
    for (let j = 0; j < actual.length; j++) {
      current.push(Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + (reference[i] === actual[j] ? 0 : 1)))
    }
    previous = current
  }
  return previous[actual.length]
}

export function textMetrics(reference, actual) {
  const expected = normalizeOcrText(reference)
  const observed = normalizeOcrText(actual)
  const characters = Array.from(expected)
  const words = expected ? expected.split(' ') : []
  const characterErrors = editDistance(characters, Array.from(observed))
  const wordErrors = editDistance(words, observed ? observed.split(' ') : [])
  return { characterErrors, characters: characters.length, cer: characters.length ? characterErrors / characters.length : observed ? null : 0,
    wordErrors, words: words.length, wer: words.length ? wordErrors / words.length : observed ? null : 0 }
}

export function fieldMetrics(fields, text) {
  const normalized = normalizeOcrText(text)
  return fields.map(field => {
    const matches = [...normalized.matchAll(new RegExp(field.pattern, 'gu'))]
    const rawValue = matches.length === 1 ? matches[0][1] ?? null : null
    const value = rawValue === null ? null : field.kind === 'money' ? rawValue.replace(/[.,\s]/gu, '') : normalizeOcrText(rawValue)
    return { id: field.id, kind: field.kind, expected: field.expected, rawValue, value, exact: value === field.expected,
      status: matches.length > 1 ? 'ambiguous' : rawValue === null ? 'missing' : value === field.expected ? 'correct' : 'incorrect' }
  })
}

export function aggregateMetrics(cases) {
  const measured = cases.filter(item => item.metrics)
  const sum = key => measured.reduce((total, item) => total + item.metrics[key], 0)
  const fields = measured.flatMap(item => item.fields)
  return { measured: measured.length, characterErrors: sum('characterErrors'), characters: sum('characters'),
    cer: sum('characters') ? sum('characterErrors') / sum('characters') : null,
    wordErrors: sum('wordErrors'), words: sum('words'), wer: sum('words') ? sum('wordErrors') / sum('words') : null,
    fieldCorrect: fields.filter(field => field.exact).length, fieldTotal: fields.length,
    fieldAccuracy: fields.length ? fields.filter(field => field.exact).length / fields.length : null }
}

export function structuredMetrics(expected, actual, keys = ['id']) {
  const key = item => keys.map(name => item[name]).join(':')
  const indexed = new Map()
  for (const item of actual) {
    const id = key(item)
    indexed.set(id, [...(indexed.get(id) ?? []), item])
  }
  const results = expected.map(item => {
    const matches = indexed.get(key(item)) ?? []
    const value = matches.length === 1 ? matches[0].text ?? matches[0].value ?? '' : null
    const exact = value !== null && normalizeOcrText(value) === normalizeOcrText(item.text ?? item.value ?? '')
    const spanExact = matches.length === 1 && ['rowSpan', 'columnSpan'].every(name => (matches[0][name] ?? 1) === (item[name] ?? 1))
    return { key: key(item), exact, spanExact, status: matches.length > 1 ? 'ambiguous' : !matches.length ? 'missing' : exact && spanExact ? 'correct' : 'incorrect' }
  })
  const correct = results.filter(item => item.exact && item.spanExact).length
  return { total: results.length, correct, accuracy: results.length ? correct / results.length : null,
    extra: actual.filter(item => !expected.some(reference => key(reference) === key(item))).length, results }
}
