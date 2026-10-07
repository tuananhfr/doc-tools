import { canChiName, solarToLunar } from '@/features/tools/vietnam'
import { NAP_AM_ELEMENTS } from '../config/nap-am'
import { elementName, napAmName } from './terms'

export interface NapAm {
  name: string
  element: string
}

/** Người dùng nhập ngày sinh dương lịch HOẶC chỉ năm âm lịch — không bắt buộc ngày sinh đầy đủ (spec v1.1 §13). */
export type BirthInput = { kind: 'SOLAR_DATE'; day: number; month: number; year: number } | { kind: 'LUNAR_YEAR'; year: number }

export interface BirthProfile {
  lunarYear: number
  /** "Bính Dần". */
  canChi: string
  napAm: NapAm
  /** Ngày dương lịch rơi trước Tết nên năm âm lịch là năm trước — để màn hình nói rõ. */
  beforeNewYear: boolean
}

const mod = (value: number, base: number) => ((value % base) + base) % base

function yearCanChi(year: number): string {
  return canChiName(mod(year + 6, 10), mod(year + 8, 12))
}

/** Năm 1984 là Giáp Tý — đầu vòng 60 năm; mỗi nạp âm giữ hai năm liền. */
export function napAmOf(lunarYear: number): NapAm {
  const index = Math.floor(mod(lunarYear - 1984, 60) / 2)
  return { name: napAmName(index), element: elementName(NAP_AM_ELEMENTS[index]) }
}

/** Năm âm lịch đổi ở Tết (`YearBoundary` 'TET'). Null khi ngày không có thật hoặc ngoài khoảng bộ đổi lịch âm hỗ trợ. */
export function birthProfile(input: BirthInput): BirthProfile | null {
  if (!Number.isInteger(input.year)) return null
  if (input.kind === 'LUNAR_YEAR') {
    return { lunarYear: input.year, canChi: yearCanChi(input.year), napAm: napAmOf(input.year), beforeNewYear: false }
  }
  const lunar = solarToLunar({ day: input.day, month: input.month, year: input.year })
  if (!lunar) return null
  return { lunarYear: lunar.year, canChi: yearCanChi(lunar.year), napAm: napAmOf(lunar.year), beforeNewYear: lunar.year < input.year }
}
