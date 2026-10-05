import { describe, expect, it } from 'vitest'
import { accuracyOf, circularMean, circularSpread, headingOf, stabilityOf } from './device-heading'
import { sunDay, sunPosition } from './solar'

describe('headingOf', () => {
  it('iOS: dùng webkitCompassHeading, cộng góc xoay màn hình', () => {
    expect(headingOf({ alpha: 10, absolute: false, webkitCompassHeading: 132 }, 0)).toBe(132)
    expect(headingOf({ alpha: 10, absolute: false, webkitCompassHeading: 300 }, 90)).toBe(30)
  })

  it('Android: alpha tuyệt đối đo ngược chiều kim đồng hồ', () => {
    expect(headingOf({ alpha: 90, absolute: true }, 0)).toBe(270)
    expect(headingOf({ alpha: 0, absolute: true }, 0)).toBe(0)
  })

  it('alpha tương đối không phải la bàn — trả null thay vì một số sai', () => {
    expect(headingOf({ alpha: 90, absolute: false }, 0)).toBeNull()
    expect(headingOf({ alpha: null, absolute: true }, 0)).toBeNull()
  })

  it('sai số: chỉ lấy số máy tự báo, số âm là chưa hiệu chỉnh', () => {
    expect(accuracyOf({ alpha: null, absolute: false, webkitCompassAccuracy: 15 })).toBe(15)
    expect(accuracyOf({ alpha: null, absolute: false, webkitCompassAccuracy: -1 })).toBeNull()
    expect(accuracyOf({ alpha: 5, absolute: true })).toBeNull()
  })
})

describe('trung bình góc', () => {
  it('359° và 1° ra 0°', () => {
    expect(circularMean([359, 1])).toBeCloseTo(0, 6)
    expect(circularMean([350, 10, 0])).toBeCloseTo(0, 6)
    expect(circularMean([])).toBeNull()
  })

  it('độ ổn định theo độ tản', () => {
    expect(stabilityOf(circularSpread([132, 132.5, 131.8, 132.2]))).toBe('STABLE')
    expect(stabilityOf(circularSpread([120, 130, 140, 125]))).toBe('WOBBLY')
    expect(stabilityOf(circularSpread([0, 90, 180, 45]))).toBe('UNSTABLE')
    expect(stabilityOf(circularSpread([5]))).toBeNull()
  })
})

describe('mặt trời — Hà Nội 21,03°B 105,85°Đ', () => {
  const lat = 21.0285
  const lon = 105.8542
  const local = (date: Date | null) => {
    if (!date) return null
    const minutes = (date.getUTCHours() * 60 + date.getUTCMinutes() + 7 * 60) % 1440
    return minutes
  }

  it('hạ chí 21/06/2026: mọc ~05:13, lặn ~18:41 giờ Việt Nam', () => {
    const day = sunDay(2026, 6, 21, lat, lon)
    expect(Math.abs(local(day.sunrise)! - (5 * 60 + 13))).toBeLessThanOrEqual(4)
    expect(Math.abs(local(day.sunset)! - (18 * 60 + 41))).toBeLessThanOrEqual(4)
    // Hạ chí mặt trời mọc lệch hẳn về Đông Bắc.
    expect(day.riseAzimuth).toBeGreaterThan(60)
    expect(day.riseAzimuth).toBeLessThan(70)
  })

  it('xuân phân: chính trưa ở chính Nam, cao ~69°; mọc gần chính Đông', () => {
    const day = sunDay(2026, 3, 20, lat, lon)
    const noon = sunPosition(day.noon, lat, lon)
    expect(noon.azimuth).toBeGreaterThan(178)
    expect(noon.azimuth).toBeLessThan(182)
    expect(noon.elevation).toBeCloseTo(90 - lat, 0)
    expect(Math.abs(day.riseAzimuth! - 90)).toBeLessThan(1.5)
  })

  it('vùng cực giữa mùa hè: không lặn → null, không bịa giờ', () => {
    const day = sunDay(2026, 6, 21, 78.2, 15.6)
    expect(day.sunrise).toBeNull()
    expect(day.sunset).toBeNull()
  })
})
