import { describe, expect, it } from 'vitest'
import { MONEY_GROUPS, MONEY_PRESETS, type MoneyPreset } from '../config/money-presets'
import { evaluatePreset, formatMoneyValue, parseMoney, presetCode } from './money'

const preset = (id: string): MoneyPreset => {
  const found = MONEY_PRESETS.find((item) => item.id === id)
  if (!found) throw new Error(`không có preset ${id}`)
  return found
}

const rows = (id: string, texts: Record<string, string>) => {
  const outcome = evaluatePreset(preset(id), texts)
  if (!outcome.ok) throw new Error(`phải tính được ${id}: ${outcome.reason ?? outcome.invalid.join(',')}`)
  return outcome
}

describe('parseMoney', () => {
  it('coi dấu theo sau bởi đúng ba chữ số là dấu nhóm nghìn', () => {
    expect(parseMoney('150.000')).toBe(150000)
    expect(parseMoney('150,000')).toBe(150000)
    expect(parseMoney('1.500')).toBe(1500)
    expect(parseMoney('1.500.000')).toBe(1500000)
    expect(parseMoney('12 500 000')).toBe(12500000)
  })

  it('các trường hợp còn lại đọc như số thập phân', () => {
    expect(parseMoney('1500,5')).toBe(1500.5)
    expect(parseMoney('12.50')).toBe(12.5)
    expect(parseMoney('1.500.000,25')).toBe(1500000.25)
    expect(parseMoney('1,500,000.25')).toBe(1500000.25)
    expect(parseMoney('0')).toBe(0)
  })

  it('từ chối chữ và số âm', () => {
    expect(parseMoney('mười nghìn')).toBeNull()
    expect(parseMoney('-5000')).toBeNull()
    expect(parseMoney('')).toBeNull()
  })
})

describe('formatMoneyValue', () => {
  it('in tiền kiểu Việt, phần trăm kèm dấu %', () => {
    expect(formatMoneyValue(1500000, 'money')).toBe('1.500.000')
    expect(formatMoneyValue(909090.9090909, 'money')).toBe('909.090,91')
    expect(formatMoneyValue(33.3333, 'percent')).toBe('33,33%')
    expect(formatMoneyValue(-0, 'money')).toBe('0')
  })
})

describe('evaluatePreset', () => {
  it('phần trăm', () => {
    expect(rows('percent-of', { rate: '8', base: '1.500.000' }).rows[0].value).toBeCloseTo(120000, 6)
    expect(rows('percent-ratio', { part: '250', whole: '1000' }).rows[0].value).toBeCloseTo(25, 10)
    const up = rows('percent-change', { from: '200', to: '250' })
    expect(up.rows[0]).toMatchObject({ label: 'Tăng', unit: 'percent' })
    expect(up.rows[0].value).toBeCloseTo(25, 10)
    const down = rows('percent-change', { from: '250', to: '200' })
    expect(down.rows[0].label).toBe('Giảm')
    expect(down.rows[0].value).toBeCloseTo(20, 10)
    expect(down.rows[1].value).toBe(-50)
  })

  it('cộng và tách thuế là hai phép ngược nhau', () => {
    const added = rows('vat-add', { net: '1.000.000', rate: '10' })
    expect(added.rows.map((row) => row.value)).toEqual([1100000, 100000])
    const extracted = rows('vat-extract', { gross: '1.100.000', rate: '10' })
    expect(extracted.rows[0].value).toBeCloseTo(1000000, 6)
    expect(extracted.rows[1].value).toBeCloseTo(100000, 6)
  })

  it('thuế suất không có giá trị mặc định: bỏ trống là chưa đủ dữ liệu', () => {
    expect(evaluatePreset(preset('vat-add'), { net: '1000000' })).toEqual({ ok: false, invalid: [], reason: null })
  })

  it('chiết khấu', () => {
    expect(rows('discount', { price: '2.000.000', rate: '15' }).rows.map((row) => row.value)).toEqual([1700000, 300000])
    expect(evaluatePreset(preset('discount'), { price: '100', rate: '120' })).toMatchObject({ ok: false, reason: expect.stringContaining('100%') })
  })

  it('margin tính trên giá bán, markup tính trên giá vốn', () => {
    const outcome = rows('margin', { cost: '80', price: '100' })
    expect(outcome.rows[0].value).toBeCloseTo(20, 10)
    expect(outcome.rows[1].value).toBeCloseTo(25, 10)
    expect(outcome.rows[2].value).toBe(20)
  })

  it('giá bán từ margin và từ markup khác nhau với cùng một con số phần trăm', () => {
    const byMargin = rows('price-from-margin', { cost: '80', margin: '20' })
    expect(byMargin.rows[0].value).toBeCloseTo(100, 10)
    expect(byMargin.rows[2].value).toBeCloseTo(25, 10)
    const byMarkup = rows('price-from-markup', { cost: '80', markup: '20' })
    expect(byMarkup.rows[0].value).toBeCloseTo(96, 10)
    expect(byMarkup.rows[2].value).toBeCloseTo(16.6667, 3)
    expect(evaluatePreset(preset('price-from-margin'), { cost: '80', margin: '100' })).toMatchObject({ ok: false, reason: expect.stringContaining('100%') })
  })

  it('chia tiền: làm tròn LÊN nghìn và nói ra phần dư', () => {
    const outcome = rows('split', { total: '1.000.000', people: '3' })
    expect(outcome.rows[0].value).toBeCloseTo(333333.33, 2)
    expect(outcome.rows[2].value).toBe(334000)
    expect(outcome.rows[3].value).toBe(2000)
    expect(outcome.expression).toBe('1.000.000 ÷ 3')
    const tipped = rows('split', { total: '1.000.000', people: '4', extra: '10' })
    expect(tipped.rows[1].value).toBeCloseTo(1100000, 6)
    expect(tipped.rows[0].value).toBeCloseTo(275000, 6)
    expect(tipped.expression).toBe('1.000.000 × (1 + 10%) ÷ 4')
  })

  it('số người phải là số nguyên từ 1', () => {
    expect(evaluatePreset(preset('split'), { total: '100', people: '2,5' })).toMatchObject({ ok: false, invalid: ['people'] })
    expect(evaluatePreset(preset('split'), { total: '100', people: '0' })).toMatchObject({ ok: false, invalid: ['people'] })
  })

  it('chia cho 0 báo lý do, không ra Infinity', () => {
    expect(evaluatePreset(preset('percent-ratio'), { part: '5', whole: '0' })).toMatchObject({ ok: false, reason: expect.any(String) })
    expect(evaluatePreset(preset('percent-change'), { from: '0', to: '5' })).toMatchObject({ ok: false, reason: expect.any(String) })
  })

  it('biểu thức in lại đúng số đã hiểu', () => {
    expect(rows('vat-add', { net: '150.000', rate: '8' }).expression).toBe('150.000 × (1 + 8%)')
  })
})

describe('danh mục preset', () => {
  it('id không trùng, phiên bản là số nguyên dương, nhóm nào cũng có preset', () => {
    expect(new Set(MONEY_PRESETS.map((item) => item.id)).size).toBe(MONEY_PRESETS.length)
    for (const item of MONEY_PRESETS) expect(Number.isInteger(item.version) && item.version >= 1).toBe(true)
    for (const group of MONEY_GROUPS) expect(MONEY_PRESETS.some((item) => item.group === group.value)).toBe(true)
  })

  it('không preset thuế nào gắn sẵn thuế suất', () => {
    for (const item of MONEY_PRESETS.filter((entry) => entry.group === 'tax')) {
      const rate = item.inputs.find((input) => input.key === 'rate')
      expect(rate?.optional).toBeFalsy()
    }
  })

  it('mã preset in kèm phiên bản', () => {
    expect(presetCode(preset('vat-add'))).toBe('vat-add · v1')
  })
})
