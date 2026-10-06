import { solarToLunar } from '@/features/tools/vietnam'
import { NAP_AM, type NapAm } from '../config/nap-am'

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

const STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

const mod = (value: number, base: number) => ((value % base) + base) % base

function yearCanChi(year: number): string {
  return `${STEMS[mod(year + 6, 10)]} ${BRANCHES[mod(year + 8, 12)]}`
}

/** Năm 1984 là Giáp Tý — đầu vòng 60 năm; mỗi nạp âm giữ hai năm liền. */
export function napAmOf(lunarYear: number): NapAm {
  return NAP_AM[Math.floor(mod(lunarYear - 1984, 60) / 2)]
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
