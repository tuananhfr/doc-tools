import { describe, expect, it } from 'vitest'
import { NUMEROLOGY_VALUES, NUMEROLOGY_METRICS } from '../data/numerology-meanings'
import { NUMEROLOGY_CONCLUSION_CUES } from '../data/numerology-conclusion-cues'
import { NUMEROLOGY_CONCLUSION_LINKS } from '../data/numerology-conclusion-links'
import { PLAYING_CARD_CUES } from '../data/playing-card-conclusion-cues'
import { CONCLUSION_VERSION } from '../config/conclusion-method'
import type { CardIdentity, DrawResult, Metric, NumerologyResult } from '../types/entertainment.types'
import { TAROT_MEANINGS, drawReading } from './card-reading'
import { cardConclusionCue, TAROT_CONCLUSION_CUES } from './draw-conclusion'
import { numerologyReading } from './numerology-reading'
import { drawReadingLines, numerologyReadingLines } from './reading-report'

const card = (id: string, position: number, orientation: CardIdentity['orientation'] = 'UPRIGHT'): CardIdentity => ({ id, position, orientation })
const draw = (ids: string[], kind: DrawResult['kind'] = 'tarot'): DrawResult => ({ kind, expires_at: 1, cards: ids.map((id, index) => card(id, index + 1)) })
const metric = (id: string, value: number | null): Metric => ({ id, value, total: value ?? 0, steps: value === null ? [] : [value] })
const numbers = (metrics: Metric[], year = 2026): NumerologyResult => ({ normalized_name: null, name_policy: 'AEIOU', master_policy: '11/22/33', personal_year: year, metrics })
const full = numbers([metric('life_path', 6), metric('birthday', 11), metric('personal_year', 5), metric('expression', 5), metric('soul_urge', 11), metric('personality', 3)])

describe('conclusion data', () => {
  it('covers all card orientations without treating reversal as an automatic bad outcome', () => {
    expect(Object.keys(TAROT_CONCLUSION_CUES).sort()).toEqual(Object.keys(TAROT_MEANINGS).sort())
    expect(Object.keys(PLAYING_CARD_CUES)).toHaveLength(52)
    for (const id of Object.keys(TAROT_MEANINGS)) {
      const upright = cardConclusionCue('tarot', card(id, 1))!
      const reversed = cardConclusionCue('tarot', card(id, 1, 'REVERSED'))!
      expect(upright.overview).not.toBe(reversed.overview)
      for (const cue of [upright, reversed]) {
        for (const text of [cue.overview, cue.obstacle, cue.obstacleReason, cue.direction]) expect(text).toMatch(/[.!?]$/u)
        expect(['positive', 'mixed', 'difficult']).toContain(cue.tone)
      }
    }
    for (const cue of Object.values(PLAYING_CARD_CUES)) {
      for (const text of [cue.overview, cue.obstacle, cue.obstacleReason, cue.direction]) expect(text).toMatch(/[.!?]$/u)
    }
    expect(TAROT_CONCLUSION_CUES.SWORDS_8.REVERSED.tone).toBe('positive')
    expect(cardConclusionCue('tarot', card('__proto__', 1))).toBeNull()
    expect(cardConclusionCue('cards', card('HA', 1, 'REVERSED'))).toBeNull()
  })

  it('defines every number cue and every pair of base themes', () => {
    expect(Object.keys(NUMEROLOGY_CONCLUSION_CUES).map(Number)).toEqual([...NUMEROLOGY_VALUES])
    expect(Object.keys(NUMEROLOGY_CONCLUSION_LINKS)).toHaveLength(45)
    for (const cue of Object.values(NUMEROLOGY_CONCLUSION_CUES)) {
      for (const id of NUMEROLOGY_METRICS) expect(cue[id]).toMatch(/[.!?]$/u)
    }
    for (let first = 1; first <= 9; first++) for (let second = first; second <= 9; second++) {
      expect(NUMEROLOGY_CONCLUSION_LINKS[`${first}:${second}`].text).toMatch(/[.!?]$/u)
      expect(NUMEROLOGY_CONCLUSION_LINKS[`${first}:${second}`].advice).toMatch(/[.!?]$/u)
    }
  })
})

describe('card conclusion synthesis', () => {
  it('connects the situation, obstacle and advice in the approved three-card example', () => {
    const result = draw(['CUPS_2', 'WANDS_5', 'MAJOR_14'])
    const names: Record<string, string> = { CUPS_2: '2 Cốc', WANDS_5: '5 Gậy', MAJOR_14: 'Tiết Độ' }
    const summary = drawReading(result, item => names[item.id]).summary!
    expect(summary.conclusion.paragraphs[0]).toBe('Hai bên có sự quan tâm và muốn hiểu nhau hơn. Đừng chỉ muốn làm theo ý mình hoặc cố thắng cuộc tranh luận.')
    expect(summary.conclusion.advice).toContain('Trao đổi bình tĩnh, nhường nhau')
    expect(summary.items.map(item => `${item.role}: ${item.label}`)).toEqual(['Tình huống: 2 Cốc (xuôi)', 'Trở ngại: 5 Gậy (xuôi)', 'Lời khuyên: Tiết Độ (xuôi)'])
  })

  it('uses the approved plain Vietnamese wording for the three kings and explains its basis', () => {
    const summary = drawReading(draw(['SK', 'CK', 'HK'], 'cards')).summary!
    expect(summary.conclusion.paragraphs).toEqual(['Bạn có thể đang chịu áp lực từ một người đặt yêu cầu cao. Đừng chờ người khác quyết định mọi việc; hãy chủ động phần việc của mình.'])
    expect(summary.conclusion.advice).toBe('Hỏi ý kiến người có kinh nghiệm mà bạn tin tưởng.')
    expect(summary.items.map(item => item.text)).toEqual([
      'Tượng trưng cho người có quyền, quyết đoán và thường đặt yêu cầu cao.',
      'Ở vị trí này, lá bài nhắc tới việc quá trông chờ người dẫn dắt.',
      'Gợi sự giúp đỡ từ một người tử tế, biết lắng nghe.',
    ])
    expect(summary.items.some(item => item.text === summary.conclusion.advice)).toBe(false)
    expect(JSON.stringify(summary)).not.toMatch(/Chuyện cần chú ý nhất|điều dễ làm chuyện này vướng lại|&#x/u)
  })

  it('changes the reading when the same cards change roles', () => {
    const normal = drawReading(draw(['CUPS_2', 'WANDS_5', 'MAJOR_14'])).summary!
    const swapped = drawReading(draw(['WANDS_5', 'CUPS_2', 'MAJOR_14'])).summary!
    expect(swapped.conclusion.paragraphs[0]).not.toBe(normal.conclusion.paragraphs[0])
    expect(swapped.conclusion.paragraphs[0]).toContain('dễ tranh cãi')
    expect(swapped.conclusion.paragraphs[0]).toContain('đừng chờ người kia đoán ý')
    expect(swapped.items[1].text).toBe('Nhắc tới mong muốn chưa được trao đổi giữa hai bên.')
  })

  it('uses a reversed obstacle meaning and keeps source snapshots unchanged', () => {
    const result = draw(['CUPS_2', 'WANDS_5', 'MAJOR_14'])
    result.cards[1].orientation = 'REVERSED'
    const before = JSON.stringify(result)
    const summary = drawReading(result).summary!
    expect(summary.conclusion.paragraphs[0]).toContain('né bất đồng')
    expect(summary.conclusion.paragraphs[0]).not.toContain('cố thắng cuộc tranh luận')
    expect(JSON.stringify(result)).toBe(before)
    expect(drawReading({ ...result, cards: [...result.cards].reverse() }).summary).toEqual(summary)
  })

  it('uses support and direction in five cards, with a conditional outcome', () => {
    const summary = drawReading(draw(['CUPS_2', 'WANDS_5', 'PENTACLES_3', 'MAJOR_14', 'MAJOR_19'])).summary!
    expect(summary.conclusion.paragraphs[1]).toBe(TAROT_MEANINGS.PENTACLES_3.UPRIGHT.advice)
    expect(summary.conclusion.paragraphs[2]).toBe('Bạn có thể tận hưởng kết quả nếu tiếp tục làm tốt phần còn lại.')
    expect(summary.items).toHaveLength(5)
  })

  it('does not turn a difficult support card into a promise of good fortune', () => {
    const summary = drawReading(draw(['CUPS_2', 'WANDS_5', 'SWORDS_9', 'MAJOR_14', 'SWORDS_10'])).summary!
    expect(summary.conclusion.paragraphs[1]).toBe(TAROT_MEANINGS.SWORDS_9.UPRIGHT.advice)
    expect(summary.conclusion.paragraphs[2]).toBe(TAROT_CONCLUSION_CUES.SWORDS_10.UPRIGHT.direction)
  })

  it('supports all existing counts and takes advice from the next-step slot in ten cards', () => {
    const ids = ['CUPS_2', 'WANDS_5', 'SWORDS_4', 'PENTACLES_3', 'MAJOR_19', 'MAJOR_14', 'CUPS_8', 'SWORDS_ACE', 'WANDS_3', 'MAJOR_21']
    for (const amount of [1, 3, 5, 7, 10]) expect(drawReading(draw(ids.slice(0, amount))).summary?.items).toHaveLength(amount)
    const ten = drawReading(draw(ids)).summary!
    expect(ten.advice?.label).toBe('MAJOR_14')
    expect(ten.items[5].role).toBe('Bước tiếp theo')
    const cards = ['HA', 'D7', 'C5', 'HK', 'H9', 'S4', 'D10', 'CJ', 'HQ']
    for (const amount of [1, 3, 5, 7, 9]) expect(drawReading(draw(cards.slice(0, amount), 'cards')).summary?.items).toHaveLength(amount)
    expect(drawReading(draw(['UNKNOWN'])).summary).toBeNull()
    expect(drawReading(draw(['CUPS_2', 'WANDS_5'])).summary).toBeNull()
  })
})

describe('numerology conclusion synthesis', () => {
  it('connects core roles and separates the selected year from personality', () => {
    const summary = numerologyReading(full).summary!
    expect(summary.conclusion.paragraphs[0]).toContain('Bạn thường lo cho người thân')
    expect(summary.conclusion.paragraphs[0]).toContain('Bạn mong được thấu hiểu')
    expect(summary.conclusion.paragraphs[0]).toContain('nhận thêm việc chỉ để mọi người vui')
    expect(summary.conclusion.paragraphs[1]).toContain('Bạn có thể ứng biến nhanh')
    expect(summary.conclusion.paragraphs[1]).toContain('Người mới gặp có thể thấy bạn vui vẻ')
    expect(summary.conclusion.paragraphs.join(' ')).not.toContain('Năm cá nhân')
    expect(summary.conclusion.period?.title).toBe('Năm cá nhân 2026 · 5')
    expect(summary.conclusion.period?.text).toContain('bỏ quên thời gian của mình')
    expect(summary.items.map(item => item.label)).toContain('Ngày sinh: 11')
    expect(summary.items.map(item => item.label)).toContain('Nội tâm: 11')
  })

  it('explains care and freedom together without labeling different numbers incompatible', () => {
    const summary = numerologyReading(numbers([metric('life_path', 6), metric('soul_urge', 5)])).summary!
    expect(summary.conclusion.paragraphs[0]).toBe('Bạn thường lo cho người thân và muốn mọi người sống hòa thuận. Bạn cũng cần tự do và thời gian riêng. Đừng nhận hết việc của mọi người rồi bỏ quên thời gian của mình.')
    expect(summary.conclusion.advice).toBe('Chia việc với người thân và giữ một khoảng riêng mỗi ngày.')
    expect(summary.conclusion.paragraphs.join(' ')).not.toContain('xung khắc')
  })

  it('states a shared link sentence once when two metric pairs map to the same themes', () => {
    const summary = numerologyReading(numbers([metric('life_path', 6), metric('soul_urge', 2), metric('expression', 2), metric('personality', 6)])).summary!
    const link = 'Bạn dễ nhường hoặc nhận thêm việc chỉ để mọi người vui.'
    expect(summary.conclusion.paragraphs).toHaveLength(2)
    expect(summary.conclusion.paragraphs[0]).toContain(link)
    expect(summary.conclusion.paragraphs.join(' ').split(link)).toHaveLength(2)
  })

  it('works with name-based metrics absent and never invents the missing inner desire', () => {
    const result = numbers([metric('life_path', 6), metric('birthday', 2), metric('personal_year', 5), metric('expression', 1), metric('soul_urge', null), metric('personality', 1)])
    const before = JSON.stringify(result)
    const summary = numerologyReading(result).summary!
    expect(summary.conclusion.paragraphs[0]).toContain('đề xuất ý tưởng và đứng ra dẫn dắt')
    expect(summary.items.map(item => item.label)).toContain('Biểu đạt: 1')
    expect(JSON.stringify(summary)).not.toContain('Nội tâm')
    expect(JSON.stringify(result)).toBe(before)
    const withoutName = numerologyReading(numbers([metric('life_path', 6), metric('birthday', 2), metric('personal_year', 5)])).summary!
    expect(withoutName.conclusion.paragraphs[0]).toContain('Bạn dễ nhận ra cảm xúc của người cùng làm')
    expect(JSON.stringify(withoutName)).not.toContain('Nhân cách')
  })

  it('preserves master numbers while relating their underlying themes', () => {
    const summary = numerologyReading(numbers([metric('life_path', 22), metric('soul_urge', 4), metric('personal_year', 11)])).summary!
    expect(summary.items.map(item => item.label)).toContain('Đường đời: 22')
    expect(summary.conclusion.paragraphs[0]).toContain('kế hoạch dài hạn')
    expect(summary.conclusion.period?.title).toBe('Năm cá nhân 2026 · 11')
    expect(summary.conclusion.period?.text).toContain('chú ý cảm xúc của nhau')
    expect(NUMEROLOGY_CONCLUSION_CUES[11].personal_year).not.toBe(NUMEROLOGY_CONCLUSION_CUES[2].personal_year)
    const single = numerologyReading(numbers([metric('life_path', 33)])).summary!
    expect(single.conclusion.paragraphs).toHaveLength(1)
    expect(single.items[0].label).toBe('Đường đời: 33')
    expect(single.conclusion.paragraphs[0]).toBe(NUMEROLOGY_CONCLUSION_CUES[33].life_path)
  })

  it('handles every valid sparse metric and keeps unknown non-null results explicit', () => {
    for (const id of NUMEROLOGY_METRICS) for (const value of id === 'birthday' ? NUMEROLOGY_VALUES.slice(0, 10) : NUMEROLOGY_VALUES) {
      const summary = numerologyReading(numbers([metric(id, value)])).summary!
      expect(summary).not.toBeNull()
      if (id === 'personal_year') expect(summary.conclusion.period).toBeDefined()
      else expect(summary.conclusion.paragraphs).toHaveLength(1)
    }
    expect(numerologyReading(numbers([metric('life_path', 10), metric('personal_year', 5)])).summary).toBeNull()
    expect(numerologyReading(numbers([metric('constructor', 1)])).summary).toBeNull()
    expect(numerologyReading(numbers([metric('soul_urge', null)])).summary).toBeNull()
    expect(numerologyReading({ ...full, metrics: [...full.metrics].reverse() }).summary).toEqual(numerologyReading(full).summary)
  })
})

describe('conclusion report parity', () => {
  it('exports the displayed conclusion, advice, reasoning and year without regenerating a different reading', () => {
    const reading = drawReading(draw(['CUPS_2', 'WANDS_5', 'MAJOR_14']))
    const lines = drawReadingLines(reading, 'tarot', item => item.id)
    expect(lines).toContain('Kết luận chung')
    for (const text of reading.summary!.conclusion.paragraphs) expect(lines).toContain(text)
    expect(lines).toContain(`Lời khuyên: ${reading.summary!.conclusion.advice}`)
    expect(lines.join('\n')).toContain(CONCLUSION_VERSION)
    const numberReading = numerologyReading(full)
    const numberLines = numerologyReadingLines(numberReading, id => id)
    for (const text of numberReading.summary!.conclusion.paragraphs) expect(numberLines).toContain(text)
    const period = numberReading.summary!.conclusion.period!
    expect(numberLines).toContain(period.title)
    expect(numberLines).toContain(period.text)
    expect(numberLines).toContain(`Nên làm trong năm này: ${period.advice}`)
  })
})
