import { normalizeDeg } from './azimuth'

/** Phần cần dùng của `DeviceOrientationEvent` — iOS thêm hai trường riêng `webkitCompass*`. */
export interface HeadingSample {
  alpha: number | null
  absolute: boolean
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}

/**
 * Hướng đầu máy chĩa tới, độ so với Bắc (từ). Null khi sự kiện không neo theo
 * Trái Đất — `alpha` tương đối (Android không có `deviceorientationabsolute`)
 * chỉ là góc so với lúc mở trang, dùng làm la bàn là sai mà không ai biết.
 *
 * `screenAngle`: góc xoay màn hình (`screen.orientation.angle`) — người cầm
 * ngang máy thì "phía trên màn hình" đã lệch 90° so với đầu máy.
 */
export function headingOf(sample: HeadingSample, screenAngle: number): number | null {
  if (typeof sample.webkitCompassHeading === 'number' && Number.isFinite(sample.webkitCompassHeading)) {
    return normalizeDeg(sample.webkitCompassHeading + screenAngle)
  }
  if (sample.absolute && sample.alpha !== null && Number.isFinite(sample.alpha)) return normalizeDeg(360 - sample.alpha + screenAngle)
  return null
}

/** Sai số iOS tự báo (độ); âm = máy chưa hiệu chỉnh. Không có thì null — không tự bịa sai số. */
export function accuracyOf(sample: HeadingSample): number | null {
  const value = sample.webkitCompassAccuracy
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** Trung bình góc theo vòng tròn: trung bình cộng của 359° và 1° phải ra 0°, không phải 180°. */
export function circularMean(degrees: number[]): number | null {
  if (degrees.length === 0) return null
  let x = 0
  let y = 0
  for (const deg of degrees) {
    x += Math.cos((deg * Math.PI) / 180)
    y += Math.sin((deg * Math.PI) / 180)
  }
  if (Math.hypot(x, y) < 1e-9) return null
  return normalizeDeg((Math.atan2(y, x) * 180) / Math.PI)
}

/** Độ lệch chuẩn theo vòng tròn (độ) của các lần đọc gần nhất. */
export function circularSpread(degrees: number[]): number | null {
  if (degrees.length < 2) return null
  let x = 0
  let y = 0
  for (const deg of degrees) {
    x += Math.cos((deg * Math.PI) / 180)
    y += Math.sin((deg * Math.PI) / 180)
  }
  const resultant = Math.min(Math.hypot(x, y) / degrees.length, 1)
  if (resultant <= 0) return 180
  return (Math.sqrt(-2 * Math.log(resultant)) * 180) / Math.PI
}

export type Stability = 'STABLE' | 'WOBBLY' | 'UNSTABLE'

/** Ngưỡng theo cỡ một cung 16 hướng (22,5°): dao động quá nửa cung thì tên hướng còn nhảy. */
export function stabilityOf(spread: number | null): Stability | null {
  if (spread === null) return null
  if (spread <= 3) return 'STABLE'
  if (spread <= 10) return 'WOBBLY'
  return 'UNSTABLE'
}
