import type { PersonProfile, RuleGroup, RuleProfile, RuleStar, RuleTrigram } from '../types/rule.types'
import { normalizeDeg } from './azimuth'
import { sittingOf } from './luopan'

export interface PersonReading {
  profile: PersonProfile
  trigram: RuleTrigram
  group: RuleGroup
  /** 8 cung của người này theo thứ tự chỉ số (0 = Bắc). */
  segments: { index: number; name: string; star: RuleStar }[]
}

export interface DirectionReading {
  segment: string
  star: RuleStar
}

/** Nhà theo Bát trạch: sao tại HƯỚNG (kết luận chính) + trạch xếp theo TOẠ (dòng phụ). */
export interface HouseReading {
  facing: DirectionReading
  /** Null khi bộ luật không khai hướng hậu thiên của quái (v1.0.0). */
  house: { segment: string; trigram: RuleTrigram; group: RuleGroup; matchesPerson: boolean } | null
}

export type RuleOutcome<T> = { ok: true; value: T } | { ok: false; reason: string }

/**
 * Kiểm bộ luật trước khi dùng — luật hỏng phải ra lỗi ở phần "Theo tuổi",
 * KHÔNG được làm hỏng phần số đo (spec v1.1 §14, ORI-010).
 */
export function validateProfile(profile: RuleProfile): string | null {
  if (profile.segments.length !== 8) return 'Bộ luật phải có đủ 8 cung.'
  const starIds = new Set(profile.stars.map((star) => star.id))
  for (const trigram of profile.trigrams) {
    const indexes = Object.entries(trigram.stars)
    if (indexes.length !== 8 || indexes.some(([id]) => !starIds.has(id))) return `Quái ${trigram.name} thiếu sao.`
    if (new Set(indexes.map(([, index]) => index)).size !== 8) return `Quái ${trigram.name} có hai sao trùng một hướng.`
    if (!profile.groups.some((group) => group.id === trigram.group)) return `Quái ${trigram.name} không thuộc nhóm nào.`
  }
  const homes = profile.trigrams.map((trigram) => trigram.home)
  if (homes.some((home) => home !== undefined)) {
    if (homes.some((home) => home === undefined || !Number.isInteger(home) || home < 0 || home > 7) || new Set(homes).size !== homes.length) return 'Hướng hậu thiên của các quái không hợp lệ.'
  }
  return null
}

/** Cung phi (số quái) theo công thức khai trong bộ luật. */
export function kuaNumber(profile: RuleProfile, year: number, sex: PersonProfile['sex']): number {
  const { modulus, zeroAs } = profile.kua
  const rule = sex === 'MALE' ? profile.kua.male : profile.kua.female
  const remainder = ((year % modulus) + modulus) % modulus
  const raw = (((rule.add + rule.sign * remainder) % modulus) + modulus) % modulus
  const kua = raw === 0 ? zeroAs : raw
  return kua === 5 ? rule.fiveAs : kua
}

export function readPerson(profile: RuleProfile, person: PersonProfile): RuleOutcome<PersonReading> {
  const broken = validateProfile(profile)
  if (broken) return { ok: false, reason: broken }
  const { min, max } = profile.inputSchema.year
  if (!Number.isInteger(person.year) || person.year < min || person.year > max) return { ok: false, reason: `Năm sinh phải trong khoảng ${min}–${max}.` }

  const number = kuaNumber(profile, person.year, person.sex)
  const trigram = profile.trigrams.find((item) => item.number === number)
  const group = trigram && profile.groups.find((item) => item.id === trigram.group)
  if (!trigram || !group) return { ok: false, reason: `Bộ luật không có quái số ${number}.` }

  const segments = profile.segments.map((name, index) => {
    const starId = Object.entries(trigram.stars).find(([, at]) => at === index)?.[0]
    return { index, name, star: profile.stars.find((star) => star.id === starId)! }
  })
  return { ok: true, value: { profile: person, trigram, group, segments } }
}

const sectorIndex = (azimuth: number) => Math.floor((normalizeDeg(azimuth) + 22.5) / 45) % 8

/** Sao của một hướng (độ) với một người: luôn chia 8 cung 45°, bất kể la bàn đang xem 8 hay 16 cung. */
export function readDirection(reading: PersonReading, azimuth: number): DirectionReading {
  const segment = reading.segments[sectorIndex(azimuth)]
  return { segment: segment.name, star: segment.star }
}

/**
 * Đọc một ngôi nhà cho một người. Hai cách có thể VÊNH nhau (người Khảm, nhà hướng
 * Đông: sao Thiên y tốt, nhưng toạ Tây là Tây tứ trạch) — giữ cả hai, không gộp.
 */
export function readHouse(profile: RuleProfile, reading: PersonReading, facing: number): HouseReading {
  const segment = sectorIndex(sittingOf(facing))
  const trigram = profile.trigrams.find((item) => item.home === segment)
  const group = trigram && profile.groups.find((item) => item.id === trigram.group)
  return {
    facing: readDirection(reading, facing),
    house: trigram && group ? { segment: profile.segments[segment], trigram, group, matchesPerson: group.id === reading.group.id } : null,
  }
}

/** Bốn hướng tốt, mạnh nhất trước. */
export function goodDirections(reading: PersonReading) {
  return reading.segments.filter((segment) => segment.star.fortune === 'GOOD').sort((a, b) => a.star.rank - b.star.rank)
}
