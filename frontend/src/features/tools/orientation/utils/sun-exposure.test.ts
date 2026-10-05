import { describe, expect, it } from 'vitest'
import { angleBetween, daySide, facesSun, readSolar, validCoordinates } from './sun-exposure'

const HANOI = { latitude: 21.0285, longitude: 105.8542 }

describe('angleBetween', () => {
  it('lấy góc nhỏ qua mốc 0°', () => {
    expect(angleBetween(350, 10)).toBe(20)
    expect(angleBetween(10, 350)).toBe(20)
    expect(angleBetween(0, 180)).toBe(180)
    expect(angleBetween(-90, 270)).toBe(0)
  })
})

describe('facesSun', () => {
  it('mặt trời dưới chân trời thì không đón nắng dù cùng hướng', () => {
    expect(facesSun(90, { azimuth: 90, elevation: -5 })).toBe(false)
    expect(facesSun(90, { azimuth: 100, elevation: 20 })).toBe(true)
    expect(facesSun(270, { azimuth: 100, elevation: 20 })).toBe(false)
  })
})

describe('readSolar + daySide', () => {
  it('thiếu toạ độ hoặc ngày giờ sai thì null, không ném lỗi', () => {
    expect(readSolar(null)).toBeNull()
    expect(readSolar({ latitude: 100, longitude: 0, date: '2026-06-21', time: '12:00' })).toBeNull()
    expect(readSolar({ ...HANOI, date: '21/06/2026', time: '12:00' })).toBeNull()
    expect(validCoordinates(Number.NaN, 0)).toBe(false)
  })

  it('Hà Nội: nhà hướng Tây nhận nắng chiều, hướng Đông nhận nắng sáng', () => {
    const reading = readSolar({ ...HANOI, date: '2026-06-21', time: '12:00' })
    expect(reading).not.toBeNull()
    expect(daySide(270, reading!.day)).toBe('AFTERNOON')
    expect(daySide(90, reading!.day)).toBe('MORNING')
    // Hạ chí ở Hà Nội mặt trời mọc lệch Bắc — nhà hướng Bắc nhận cả nắng sớm lẫn nắng muộn.
    expect(daySide(0, reading!.day)).toBe('BOTH')
  })
})
