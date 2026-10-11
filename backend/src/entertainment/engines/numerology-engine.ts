import { entError } from '../entertainment-policy'
import type { Metric, NumerologyResult } from '../entertainment.types'

const digits = (value: string | number) => [...String(value).replace(/\D/g, '')].map(Number)
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
export function reduceMetric(id: string, values: number[]): Metric {
  let value = sum(values)
  const total = value; const steps = [value]
  if (!values.length) return { id, total: 0, value: null, steps: [] }
  while (value > 9 && ![11, 22, 33].includes(value)) { value = sum(digits(value)); steps.push(value) }
  return { id, total, value, steps }
}
export function normalizeName(value: string) {
  const normalized = value.normalize('NFC').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'D')
  if (!/^[a-zA-Z\s'-]+$/.test(normalized)) entError(422, 'UNSUPPORTED_NAME')
  return normalized.toUpperCase().replace(/[^A-Z]/g, '')
}
export function calculateNumerology(body: unknown, now = Date.now()): NumerologyResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) entError(400, 'INVALID_INPUT')
  const input = body as Record<string, unknown>
  if (Object.keys(input).some(key => !['birth_date', 'name', 'personal_year'].includes(key)) || typeof input.birth_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.birth_date) || typeof input.name !== 'string' || input.name.length > 100 || !Number.isInteger(input.personal_year) || Number(input.personal_year) < 1800 || Number(input.personal_year) > 2199) entError(400, 'INVALID_INPUT')
  const [year, month, day] = input.birth_date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const today = new Date(now + 7 * 3600_000).toISOString().slice(0, 10)
  if (year < 1800 || date.toISOString().slice(0, 10) !== input.birth_date || input.birth_date > today) entError(422, 'INVALID_BIRTH_DATE')
  const name = input.name.trim() ? normalizeName(input.name.trim()) : null
  if (name === '') entError(422, 'UNSUPPORTED_NAME')
  const metrics = [reduceMetric('life_path', digits(input.birth_date)), reduceMetric('birthday', digits(day)), reduceMetric('personal_year', [...digits(day), ...digits(month), ...digits(Number(input.personal_year))])]
  if (name) {
    const letters = [...name].map(letter => ({ letter, value: (letter.charCodeAt(0) - 65) % 9 + 1 }))
    metrics.push(reduceMetric('expression', letters.map(item => item.value)), reduceMetric('soul_urge', letters.filter(item => 'AEIOU'.includes(item.letter)).map(item => item.value)), reduceMetric('personality', letters.filter(item => !'AEIOU'.includes(item.letter)).map(item => item.value)))
  }
  return { normalized_name: name, name_policy: 'NFC; strip accents; Đ→D; A–Z; AEIOU vowels; Y consonant', master_policy: 'Sum all input digits first; preserve 11/22/33 at every reduction step', metrics, personal_year: Number(input.personal_year) }
}
