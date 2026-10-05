import { normalizeDeg } from './azimuth'

const RAD = Math.PI / 180

export interface SunPosition {
  /** Độ so với Bắc THẬT, theo chiều kim đồng hồ. */
  azimuth: number
  /** Độ cao trên đường chân trời (chưa tính khúc xạ). */
  elevation: number
}

interface SolarTerms {
  declination: number
  /** Phương trình thời gian, phút. */
  equationOfTime: number
}

/** Xích vĩ và phương trình thời gian theo thuật toán của NOAA (sai số cỡ 1 phút trong khoảng 1800–2100). */
function solarTerms(date: Date): SolarTerms {
  const julianDay = date.getTime() / 86_400_000 + 2_440_587.5
  const t = (julianDay - 2_451_545) / 36_525
  const meanLong = normalizeDeg(280.46646 + t * (36_000.76983 + t * 0.0003032))
  const meanAnomaly = 357.52911 + t * (35_999.05029 - 0.0001537 * t)
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const center =
    Math.sin(meanAnomaly * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomaly * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly * RAD) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const apparentLong = meanLong + center - 0.00569 - 0.00478 * Math.sin(omega * RAD)
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD)
  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(apparentLong * RAD)) / RAD
  const y = Math.tan((obliquity / 2) * RAD) ** 2
  const equationOfTime =
    (4 *
      (y * Math.sin(2 * meanLong * RAD) -
        2 * eccentricity * Math.sin(meanAnomaly * RAD) +
        4 * eccentricity * y * Math.sin(meanAnomaly * RAD) * Math.cos(2 * meanLong * RAD) -
        0.5 * y * y * Math.sin(4 * meanLong * RAD) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * RAD))) /
    RAD
  return { declination, equationOfTime }
}

/** Vị trí mặt trời tại một thời điểm và một toạ độ. Tính thuần, không gọi máy chủ nào. */
export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const { declination, equationOfTime } = solarTerms(date)
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const solarMinutes = (((utcMinutes + equationOfTime + 4 * longitude) % 1440) + 1440) % 1440
  const hourAngle = solarMinutes / 4 - 180
  const cosZenith =
    Math.sin(latitude * RAD) * Math.sin(declination * RAD) + Math.cos(latitude * RAD) * Math.cos(declination * RAD) * Math.cos(hourAngle * RAD)
  const zenith = Math.acos(Math.min(Math.max(cosZenith, -1), 1)) / RAD
  const azimuth = normalizeDeg(
    Math.atan2(Math.sin(hourAngle * RAD), Math.cos(hourAngle * RAD) * Math.sin(latitude * RAD) - Math.tan(declination * RAD) * Math.cos(latitude * RAD)) / RAD + 180,
  )
  return { azimuth, elevation: 90 - zenith }
}

export interface SunDay {
  /** null = ngày đó mặt trời không mọc / không lặn (vùng cực). */
  sunrise: Date | null
  sunset: Date | null
  noon: Date
  riseAzimuth: number | null
  setAzimuth: number | null
}

/**
 * Giờ mọc / lặn / chính trưa của ngày dương lịch `year-month-day` (tháng đếm từ 1).
 * Mọc / lặn lấy theo tâm mặt trời ở −0,833° (bán kính đĩa + khúc xạ chuẩn).
 */
export function sunDay(year: number, month: number, day: number, latitude: number, longitude: number): SunDay {
  const midnight = Date.UTC(year, month - 1, day)
  // Lặp hai lần: xích vĩ đổi theo giờ, tính lại tại đúng giờ chính trưa vừa ước lượng.
  let noonMinutes = 720 - 4 * longitude
  for (let pass = 0; pass < 2; pass++) noonMinutes = 720 - 4 * longitude - solarTerms(new Date(midnight + noonMinutes * 60_000)).equationOfTime
  const noon = new Date(midnight + noonMinutes * 60_000)
  const { declination } = solarTerms(noon)
  const cosHour =
    Math.cos(90.833 * RAD) / (Math.cos(latitude * RAD) * Math.cos(declination * RAD)) - Math.tan(latitude * RAD) * Math.tan(declination * RAD)
  if (cosHour > 1 || cosHour < -1) return { sunrise: null, sunset: null, noon, riseAzimuth: null, setAzimuth: null }
  const hourMinutes = (4 * Math.acos(cosHour)) / RAD
  const sunrise = new Date(noon.getTime() - hourMinutes * 60_000)
  const sunset = new Date(noon.getTime() + hourMinutes * 60_000)
  return {
    sunrise,
    sunset,
    noon,
    riseAzimuth: sunPosition(sunrise, latitude, longitude).azimuth,
    setAzimuth: sunPosition(sunset, latitude, longitude).azimuth,
  }
}
