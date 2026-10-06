/** Giới tính chỉ hỏi khi phương pháp cần (spec v1.1 §13). */
export type Sex = 'MALE' | 'FEMALE'

/** Một người xem theo tuổi — không tên thật, không ngày sinh đầy đủ, không lưu lại. */
export interface PersonProfile {
  id: string
  label: string
  /** Năm sinh âm lịch. */
  year: number
  sex: Sex
}

export type Fortune = 'GOOD' | 'BAD'

export interface RuleStar {
  id: string
  name: string
  fortune: Fortune
  /** Thứ hạng trong nhóm, 1 = mạnh nhất. */
  rank: number
  meaning: string
}

export interface RuleGroup {
  id: string
  name: string
}

export interface RuleTrigram {
  /** Số quái (cung phi) 1–9, không có 5. */
  number: number
  name: string
  element: string
  group: string
  /** Chỉ số hướng của chính quái theo hậu thiên (Khảm = 0 Bắc…) — để xếp trạch theo toạ. Bộ luật v1.0.0 không có. */
  home?: number
  /** Mã sao → chỉ số cung trong `segments` (0 = Bắc, theo chiều kim đồng hồ). */
  stars: Record<string, number>
}

/**
 * Công thức cung phi theo năm âm lịch: `(add + sign × (năm mod 9)) mod 9`,
 * 0 đổi thành 9, 5 đổi theo giới tính (cung 5 không có quái riêng).
 */
export interface KuaFormula {
  modulus: number
  male: { add: number; sign: 1 | -1; fiveAs: number }
  female: { add: number; sign: 1 | -1; fiveAs: number }
  zeroAs: number
}

/** Mốc đổi năm tính tuổi. Hiện chỉ có Tết; phái lấy Lập Xuân (~4/2) cần một giá trị và bộ luật mới. */
export type YearBoundary = 'TET'

/** Bộ luật xem hướng theo tuổi — dữ liệu, có phiên bản, KHÔNG viết cứng trong giao diện (spec v1.1 §14). */
export interface RuleProfile {
  id: string
  method: string
  /** Không sửa một phiên bản đã phát hành — sửa luật là ra phiên bản mới. */
  version: string
  name: string
  sourceReference: string
  inputSchema: { year: { min: number; max: number; calendar: 'LUNAR' }; sex: true }
  /** Tên 8 cung theo thứ tự chỉ số, 45° mỗi cung, Bắc = 0. */
  segments: string[]
  kua: KuaFormula
  /** Bộ luật v1.0.0 không khai — khi đó coi như Tết. */
  yearBoundary?: YearBoundary
  groups: RuleGroup[]
  stars: RuleStar[]
  trigrams: RuleTrigram[]
  /** Lời giải thích cách dùng — bắt buộc hiện kèm kết quả. */
  interpretation: string
  disclaimer: string
}
