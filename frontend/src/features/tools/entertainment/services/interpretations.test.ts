import { describe, expect, it } from 'vitest'
import { DRAW_SPREADS } from '../config/draw-spreads'
import { INTERPRETATION_VERSION } from '../config/interpretation-sources'
import { PLAYING_CARD_MEANINGS } from '../data/playing-card-meanings'
import { NUMEROLOGY_MEANINGS, NUMEROLOGY_METRICS, NUMEROLOGY_VALUES } from '../data/numerology-meanings'
import type { CardIdentity, DrawResult, NumerologyResult } from '../types/entertainment.types'
import { cardMeaning, drawReading, TAROT_MEANINGS } from './card-reading'
import { numerologyMeaning, numerologyReading } from './numerology-reading'
import { drawReadingLines, numerologyReadingLines } from './reading-report'
import { getCardArtwork } from './card-artwork'

const ranks = ['ACE', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'PAGE', 'KNIGHT', 'QUEEN', 'KING']
const tarotIds = [...Array.from({ length: 22 }, (_, i) => `MAJOR_${String(i).padStart(2, '0')}`), ...['WANDS', 'CUPS', 'SWORDS', 'PENTACLES'].flatMap(suit => ranks.map(rank => `${suit}_${rank}`))]
const cardIds = ['H', 'D', 'C', 'S'].flatMap(suit => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => suit + rank))
const card = (id: string, position = 1, orientation: CardIdentity['orientation'] = 'UPRIGHT'): CardIdentity => ({ id, position, orientation })

describe('interpretation corpus coverage', () => {
  it('covers every canonical card ID with distinct upright and reversed Tarot meanings', () => {
    expect(Object.keys(TAROT_MEANINGS).sort()).toEqual(tarotIds.sort())
    expect(Object.keys(PLAYING_CARD_MEANINGS).sort()).toEqual(cardIds.sort())
    for (const id of tarotIds) {
      expect(getCardArtwork(id)?.kind).toBe('tarot')
      expect(TAROT_MEANINGS[id].UPRIGHT.text).not.toBe(TAROT_MEANINGS[id].REVERSED.text)
    }
    for (const id of cardIds) expect(getCardArtwork(id)?.kind).toBe('cards')
    const meanings = [...Object.values(TAROT_MEANINGS).flatMap(item => [item.UPRIGHT, item.REVERSED]), ...Object.values(PLAYING_CARD_MEANINGS)]
    expect(new Set(meanings.map(item => item.text)).size).toBe(208)
    for (const item of meanings) {
      expect(item.keywords.length).toBeGreaterThanOrEqual(3)
      expect(item.text.trim()).not.toBe('')
      expect(item.advice.trim()).not.toBe('')
      expect(item.themes.length).toBeGreaterThan(0)
    }
  })

  it('covers the exact output domain of each current numerology metric', () => {
    for (const id of NUMEROLOGY_METRICS) {
      const valid = id === 'birthday' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 11] : NUMEROLOGY_VALUES
      expect(Object.keys(NUMEROLOGY_MEANINGS[id]).map(Number).sort((a, b) => a - b)).toEqual([...valid])
      for (const value of valid) expect(numerologyMeaning({ id, value, total: value, steps: [value] })?.text).toContain(String(value))
    }
    for (const value of NUMEROLOGY_VALUES) {
      const meanings = NUMEROLOGY_METRICS.flatMap(id => Object.hasOwn(NUMEROLOGY_MEANINGS[id], value) ? [NUMEROLOGY_MEANINGS[id][value]] : [])
      for (const field of ['text', 'strength', 'growth', 'advice'] as const) {
        expect(new Set(meanings.map(item => item[field])).size, `${value}: ${field} must be metric-specific`).toBe(meanings.length)
      }
    }
  })

  it('retains recognizable card meanings and distinguishes personality from a year theme', () => {
    expect(TAROT_MEANINGS.CUPS_2.UPRIGHT.text).toContain('tình cảm được đáp lại')
    expect(TAROT_MEANINGS.CUPS_2.REVERSED.text).toContain('mong muốn khác nhau')
    expect(TAROT_MEANINGS.WANDS_5.UPRIGHT.keywords).toContain('Cạnh tranh')
    expect(TAROT_MEANINGS.SWORDS_4.UPRIGHT.keywords).toContain('Nghỉ ngơi')
    expect(PLAYING_CARD_MEANINGS.H9.text).toContain('lá điều ước')
    expect(NUMEROLOGY_MEANINGS.life_path[6].text).toContain('coi trọng gia đình')
    expect(NUMEROLOGY_MEANINGS.life_path[6].growth).toContain('khó từ chối')
    expect(NUMEROLOGY_MEANINGS.personal_year[6].text).toContain('trách nhiệm chăm sóc')
    expect(NUMEROLOGY_MEANINGS.personal_year[6].strength).toContain('Sắp xếp việc chung')
  })

  it('does not substitute unknown IDs, impossible values or missing letters', () => {
    for (const id of ['UNKNOWN', 'constructor', '__proto__', 'HA']) expect(cardMeaning('tarot', card(id))).toBeNull()
    expect(cardMeaning('cards', card('HA', 1, 'REVERSED'))).toBeNull()
    for (const [id, value] of [['soul_urge', null], ['birthday', 22], ['life_path', 10], ['constructor', 1], ['life_path', NaN]] as const) {
      expect(numerologyMeaning({ id, value, total: 0, steps: [] })).toBeNull()
    }
  })
})

describe('reading and report consistency', () => {
  it('defines exactly one named position for every supported draw slot', () => {
    for (const amount of [1, 3, 5, 7, 9, 10]) {
      const result: DrawResult = { kind: 'tarot', expires_at: 1, cards: tarotIds.slice(0, amount).map((id, i) => card(id, i + 1)) }
      const reading = drawReading(result)
      expect(reading.spread?.positions).toHaveLength(amount)
      expect(new Set(DRAW_SPREADS[amount].positions.map(item => item.title)).size).toBe(amount)
      expect(reading.cards.every(item => item.position && item.meaning)).toBe(true)
    }
  })

  it('exports the selected orientation, position, source version and same displayed paragraphs', () => {
    const result: DrawResult = { kind: 'tarot', expires_at: 1, cards: [card('MAJOR_00', 1, 'REVERSED'), card('CUPS_2', 2), card('WANDS_ACE', 3)] }
    const before = JSON.stringify(result)
    const names: Record<string, string> = { MAJOR_00: 'Kẻ Khờ', CUPS_2: '2 Cốc', WANDS_ACE: 'Át Gậy' }
    const reading = drawReading(result, item => names[item.id])
    const lines = drawReadingLines(reading, 'tarot', item => item.id)
    expect(lines.join('\n')).toContain('MAJOR_00 (Ngược) · Tình huống')
    expect(lines).toContain(TAROT_MEANINGS.MAJOR_00.REVERSED.text)
    expect(lines).not.toContain(TAROT_MEANINGS.MAJOR_00.UPRIGHT.text)
    expect(reading.summary!.items.map(item => [item.role, item.label])).toEqual([
      ['Tình huống', 'Kẻ Khờ (ngược)'], ['Trở ngại', '2 Cốc (xuôi)'], ['Lời khuyên', 'Át Gậy (xuôi)'],
    ])
    for (const item of reading.summary!.items) expect(lines.join('\n')).toContain(`${item.role} · ${item.label}: ${item.text}`)
    expect(reading.summary!.advice).toEqual({ label: 'Át Gậy', text: TAROT_MEANINGS.WANDS_ACE.UPRIGHT.advice })
    for (const paragraph of reading.summary!.conclusion.paragraphs) expect(lines).toContain(paragraph)
    expect(reading.summary!.items[1].text).toBe('Nhắc tới mong muốn chưa được trao đổi giữa hai bên.')
    expect(lines.join('\n')).toContain(INTERPRETATION_VERSION)
    expect(JSON.stringify(result)).toBe(before)
  })

  it('keeps missing numerology metrics explicit and preserves master-number distinctions', () => {
    const result: NumerologyResult = { normalized_name: 'LY', name_policy: 'AEIOU', master_policy: '11/22/33', personal_year: 2026, metrics: [
      { id: 'life_path', value: 11, total: 29, steps: [29, 11] },
      { id: 'personal_year', value: 22, total: 22, steps: [22] },
      { id: 'soul_urge', value: null, total: 0, steps: [] },
    ] }
    const before = JSON.stringify(result)
    const reading = numerologyReading(result)
    const lines = numerologyReadingLines(reading, id => id)
    expect(lines).toContain(NUMEROLOGY_MEANINGS.personal_year[22].text)
    expect(lines).toContain(NUMEROLOGY_MEANINGS.life_path[11].text)
    expect(lines).not.toContain(NUMEROLOGY_MEANINGS.soul_urge[1].text)
    expect(reading.summary!.items.map(item => item.label)).toEqual(['Đường đời: 11'])
    expect(reading.summary!.conclusion.period?.title).toBe('Năm cá nhân 2026 · 22')
    expect(lines).toContain(reading.summary!.conclusion.period!.text)
    expect(lines.join('\n')).toContain(`Nên tập trung: ${NUMEROLOGY_MEANINGS.personal_year[22].strength}`)
    expect(lines.join('\n')).toContain('Không có chữ phù hợp')
    expect(lines.join('\n')).toContain(INTERPRETATION_VERSION)
    expect(JSON.stringify(result)).toBe(before)
  })

  it('does not claim a complete overview when a non-null result is unknown', () => {
    expect(drawReading({ kind: 'tarot', expires_at: 1, cards: [card('UNKNOWN')] }).summary).toBeNull()
    expect(numerologyReading({ normalized_name: null, name_policy: '', master_policy: '', personal_year: 2026, metrics: [{ id: 'life_path', value: 10, total: 10, steps: [10] }] }).summary).toBeNull()
  })
})
