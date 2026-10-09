import { describe, expect, it } from 'vitest'
import { formatRuleLines, parseRuleLines } from './rule-lines'

describe('parseRuleLines', () => {
  it('đọc giá viết kiểu Việt sau dấu phẩy tách cột cũ', () => {
    expect(parseRuleLines('50,1.984\n100,2.050\n*,3.460', 'money')).toEqual({ ok: true, lines: [{ upTo: 50, value: 1984 }, { upTo: 100, value: 2050 }, { upTo: null, value: 3460 }] })
  })

  it('vẫn mở được kết quả đã lưu theo định dạng cũ', () => {
    expect(parseRuleLines('50,1984\n*,1984.5', 'money')).toEqual({ ok: true, lines: [{ upTo: 50, value: 1984 }, { upTo: null, value: 1984.5 }] })
  })

  it('nhận dấu chấm phẩy, gạch đứng, tab và khoảng trắng làm dấu tách cột', () => {
    const expected = { ok: true, lines: [{ upTo: 50, value: 1984 }, { upTo: null, value: 2050 }] }
    expect(parseRuleLines('50; 1.984\n*; 2.050', 'money')).toEqual(expected)
    expect(parseRuleLines('50 | 1984\n* | 2050', 'money')).toEqual(expected)
    expect(parseRuleLines('50\t1984\n*\t2050', 'money')).toEqual(expected)
    expect(parseRuleLines('50 1984\n* 2050', 'money')).toEqual(expected)
  })

  it('biểu thuế: ngưỡng viết có dấu nhóm nghìn, thuế suất có phần lẻ', () => {
    expect(parseRuleLines('10.000.000; 5\n30.000.000; 2,5\n*; 35', 'decimal')).toEqual({ ok: true, lines: [{ upTo: 10_000_000, value: 5 }, { upTo: 30_000_000, value: 2.5 }, { upTo: null, value: 35 }] })
  })

  it('bỏ qua dòng trống nhưng báo đúng số dòng hỏng', () => {
    expect(parseRuleLines('50; 1984\n\nabc\n*; 2050', 'money')).toEqual({ ok: false, line: 3 })
    expect(parseRuleLines('50; -1', 'money')).toEqual({ ok: false, line: 1 })
    expect(parseRuleLines('50,5; 1984', 'money')).toEqual({ ok: false, line: 1 })
  })

  it('in lại bằng dấu chấm phẩy rồi đọc ra đúng như cũ', () => {
    const lines = [{ upTo: 50, value: 1984.5 }, { upTo: null, value: 3460 }]
    expect(parseRuleLines(formatRuleLines(lines), 'money')).toEqual({ ok: true, lines })
  })
})
