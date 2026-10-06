import { CURRENT_RULE_PROFILE } from '../config/rule-profiles'
import type { RuleProfile, Sex } from '../types/rule.types'
import { birthProfile, type BirthInput, type BirthProfile } from './birth-profile'
import { readPerson, type PersonReading } from './rule-engine'

export type BirthKind = BirthInput['kind']

/** Ô nhập của một gia chủ, giữ nguyên chuỗi người dùng gõ — chỉ sống trong RAM. */
export interface OwnerDraft {
  id: string
  label: string
  sex: Sex
  kind: BirthKind
  /** 'yyyy-mm-dd' của ô chọn ngày. */
  date: string
  year: string
}

export type OwnerReading =
  | { ok: true; birth: BirthProfile; reading: PersonReading }
  /** `birth` vẫn có khi chỉ bộ luật từ chối (năm ngoài khoảng luật) — tuổi, nạp âm vẫn hiện được. */
  | { ok: false; birth: BirthProfile | null; reason: string }

export const blankOwner = (index: number): OwnerDraft => ({ id: `p${index}`, label: `Người ${index}`, sex: 'MALE', kind: 'SOLAR_DATE', date: '', year: '' })

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function birthInput(draft: OwnerDraft): BirthInput | null | 'INVALID' {
  if (draft.kind === 'LUNAR_YEAR') {
    const text = draft.year.trim()
    if (text === '') return null
    return /^\d{4}$/.test(text) ? { kind: 'LUNAR_YEAR', year: Number(text) } : 'INVALID'
  }
  if (draft.date === '') return null
  const match = DATE.exec(draft.date)
  return match ? { kind: 'SOLAR_DATE', year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : 'INVALID'
}

/** Null = chưa nhập gì — chưa nhập thì không có gì để báo lỗi. */
export function readOwner(draft: OwnerDraft, profile: RuleProfile = CURRENT_RULE_PROFILE): OwnerReading | null {
  const input = birthInput(draft)
  if (input === null) return null
  if (input === 'INVALID') return { ok: false, birth: null, reason: draft.kind === 'LUNAR_YEAR' ? 'Nhập năm bốn chữ số, ví dụ 1986.' : 'Ngày sinh không hợp lệ.' }
  const birth = birthProfile(input)
  if (!birth) return { ok: false, birth: null, reason: 'Ngày này không có thật hoặc nằm ngoài khoảng lịch âm hỗ trợ (1800–2199).' }
  const outcome = readPerson(profile, { id: draft.id, label: draft.label, year: birth.lunarYear, sex: draft.sex })
  return outcome.ok ? { ok: true, birth, reading: outcome.value } : { ok: false, birth, reason: outcome.reason }
}
