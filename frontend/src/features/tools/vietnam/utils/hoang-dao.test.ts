import { describe, expect, it } from 'vitest'
import { dayGoodHours, daySpirit } from './hoang-dao'
import { solarToLunar } from './lunar-calendar'

// Bảng giờ hoàng đạo theo chi ngày của Hồ Ngọc Đức (bit thứ i = giờ chi i), chỉ số = chi ngày % 6.
const HND_GIO_HD = ['110100101100', '001101001011', '110011010010', '101100110100', '001011001101', '010010110011']
const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

describe('dayGoodHours', () => {
  it('khớp bảng giờ hoàng đạo của Hồ Ngọc Đức cho cả 12 chi ngày', () => {
    for (let jd = 2460000; jd < 2460012; jd += 1) {
      const pattern = HND_GIO_HD[((jd + 1) % 12) % 6]
      expect(dayGoodHours(jd).map((item) => item.branch)).toEqual(BRANCHES.filter((_, index) => pattern[index] === '1'))
    }
  })

  it('đánh giờ Tý từ 23:00 đến 01:00', () => {
    const tyDay = 2460000 + ((12 - ((2460000 + 1) % 12)) % 12) // một ngày Tý: giờ Tý là hoàng đạo
    expect(dayGoodHours(tyDay)[0]).toEqual({ branch: 'Tý', from: '23:00', to: '01:00' })
  })
})

describe('daySpirit', () => {
  it('ngày Tý tháng Giêng là Thanh Long (hoàng đạo), ngày Ngọ là Bạch Hổ (hắc đạo)', () => {
    const tyDay = 2460000 + ((12 - ((2460000 + 1) % 12)) % 12)
    expect(daySpirit(1, tyDay)).toEqual({ name: 'Thanh Long', good: true })
    expect(daySpirit(7, tyDay + 6)).toEqual({ name: 'Bạch Hổ', good: false })
  })

  it('tháng 5 khởi Thanh Long ở ngày Thân', () => {
    const thanDay = 2460000 + ((20 - ((2460000 + 1) % 12)) % 12)
    expect(daySpirit(5, thanDay).name).toBe('Thanh Long')
    expect(daySpirit(11, thanDay + 1).name).toBe('Minh Đường')
  })

  it('đủ 6 ngày hoàng đạo trong mỗi vòng 12 ngày', () => {
    const lunar = solarToLunar({ year: 2026, month: 10, day: 6 })!
    const good = Array.from({ length: 12 }, (_, index) => daySpirit(lunar.month, lunar.julianDay + index).good)
    expect(good.filter(Boolean)).toHaveLength(6)
  })
})
