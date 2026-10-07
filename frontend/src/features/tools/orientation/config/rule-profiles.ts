import type { RuleProfile } from '../types/rule.types'

/**
 * Bộ luật xem hướng theo tuổi. Đây là DỮ LIỆU: engine (`utils/rule-engine.ts`)
 * không biết gì về Bát trạch ngoài những gì khai ở đây. Sửa luật = thêm một mục
 * với `version` mới, KHÔNG sửa mục đã phát hành — kết quả cũ ghi phiên bản để
 * người xem biết nó tính theo bộ luật nào.
 *
 * Mục CUỐI là bộ luật đang dùng (`CURRENT_RULE_PROFILE`); mục cũ giữ lại để đọc
 * được kết quả đã ghi phiên bản cũ.
 *
 * Bát trạch v1 — đối chiếu 04/10/2026:
 * - Cung phi theo Lạc thư, năm âm lịch: nam `(11 − năm mod 9) mod 9`, nữ
 *   `(4 + năm mod 9) mod 9`; 0 → 9; ra 5 thì nam lấy Khôn (2), nữ lấy Cấn (8).
 *   Kiểm: nam 1990 Khảm, nữ 1990 Cấn, nam 1984 Đoài, nữ 1984 Cấn, nam 1986 Khôn,
 *   nam 2000 Ly, nữ 2000 Càn (test ở `rule-engine.test.ts`).
 * - Bảng 8 sao × 8 quái theo "Du niên ca quyết" của Bát Trạch Minh Kính; mỗi hàng
 *   là một hoán vị đủ 8 hướng, các cặp sao đối xứng (Sinh khí Khảm ↔ Tốn, Thiên y
 *   Khảm ↔ Chấn…) — test kiểm cả hai tính chất này.
 */
const BAT_TRACH_1_0: RuleProfile = {
  id: 'bat-trach',
  method: 'BAT_TRACH',
  version: '1.0.0',
  text: {
    name: 'orientation:profiles.batTrach.name',
    source: 'orientation:profiles.batTrach.source',
    interpretation: 'orientation:profiles.batTrach.interpretationV1',
    disclaimer: 'orientation:profiles.batTrach.disclaimer',
  },
  inputSchema: { year: { min: 1900, max: 2100, calendar: 'LUNAR' }, sex: true },
  segments: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  kua: {
    modulus: 9,
    male: { add: 11, sign: -1, fiveAs: 2 },
    female: { add: 4, sign: 1, fiveAs: 8 },
    zeroAs: 9,
  },
  groups: [
    { id: 'EAST' },
    { id: 'WEST' },
  ],
  stars: [
    { id: 'SINH_KHI', fortune: 'GOOD', rank: 1 },
    { id: 'THIEN_Y', fortune: 'GOOD', rank: 2 },
    { id: 'DIEN_NIEN', fortune: 'GOOD', rank: 3 },
    { id: 'PHUC_VI', fortune: 'GOOD', rank: 4 },
    { id: 'TUYET_MENH', fortune: 'BAD', rank: 1 },
    { id: 'NGU_QUY', fortune: 'BAD', rank: 2 },
    { id: 'LUC_SAT', fortune: 'BAD', rank: 3 },
    { id: 'HOA_HAI', fortune: 'BAD', rank: 4 },
  ],
  trigrams: [
    { number: 1, id: 'KAN', element: 'WATER', group: 'EAST', stars: { SINH_KHI: 3, THIEN_Y: 2, DIEN_NIEN: 4, PHUC_VI: 0, HOA_HAI: 6, NGU_QUY: 1, LUC_SAT: 7, TUYET_MENH: 5 } },
    { number: 2, id: 'KUN', element: 'EARTH', group: 'WEST', stars: { SINH_KHI: 1, THIEN_Y: 6, DIEN_NIEN: 7, PHUC_VI: 5, HOA_HAI: 2, NGU_QUY: 3, LUC_SAT: 4, TUYET_MENH: 0 } },
    { number: 3, id: 'ZHEN', element: 'WOOD', group: 'EAST', stars: { SINH_KHI: 4, THIEN_Y: 0, DIEN_NIEN: 3, PHUC_VI: 2, HOA_HAI: 5, NGU_QUY: 7, LUC_SAT: 1, TUYET_MENH: 6 } },
    { number: 4, id: 'XUN', element: 'WOOD', group: 'EAST', stars: { SINH_KHI: 0, THIEN_Y: 4, DIEN_NIEN: 2, PHUC_VI: 3, HOA_HAI: 7, NGU_QUY: 5, LUC_SAT: 6, TUYET_MENH: 1 } },
    { number: 6, id: 'QIAN', element: 'METAL', group: 'WEST', stars: { SINH_KHI: 6, THIEN_Y: 1, DIEN_NIEN: 5, PHUC_VI: 7, HOA_HAI: 3, NGU_QUY: 2, LUC_SAT: 0, TUYET_MENH: 4 } },
    { number: 7, id: 'DUI', element: 'METAL', group: 'WEST', stars: { SINH_KHI: 7, THIEN_Y: 5, DIEN_NIEN: 1, PHUC_VI: 6, HOA_HAI: 0, NGU_QUY: 4, LUC_SAT: 3, TUYET_MENH: 2 } },
    { number: 8, id: 'GEN', element: 'EARTH', group: 'WEST', stars: { SINH_KHI: 5, THIEN_Y: 7, DIEN_NIEN: 6, PHUC_VI: 1, HOA_HAI: 4, NGU_QUY: 0, LUC_SAT: 2, TUYET_MENH: 3 } },
    { number: 9, id: 'LI', element: 'FIRE', group: 'EAST', stars: { SINH_KHI: 2, THIEN_Y: 3, DIEN_NIEN: 0, PHUC_VI: 4, HOA_HAI: 1, NGU_QUY: 6, LUC_SAT: 5, TUYET_MENH: 7 } },
  ],
}

/** Hậu thiên bát quái: số quái → chỉ số hướng của chính nó (Khảm Bắc, Khôn Tây Nam…). */
const HOME: Record<number, number> = { 1: 0, 2: 5, 3: 2, 4: 3, 6: 7, 7: 6, 8: 1, 9: 4 }

/**
 * Bát trạch v1.1 — 06/10/2026. Bảng sao và cung phi GIỮ NGUYÊN v1.0.0; thêm:
 * - mốc đổi năm khai rõ là Tết (web Việt Nam phổ biến; phái Trung Hoa lấy Lập Xuân);
 * - hướng hậu thiên của từng quái để xếp nhà Đông / Tây tứ trạch theo TOẠ. Kết luận
 *   chính vẫn là sao tại HƯỚNG; trạch theo toạ chỉ là dòng phụ vì hai cách có thể vênh.
 */
const BAT_TRACH_1_1: RuleProfile = {
  ...BAT_TRACH_1_0,
  version: '1.1.0',
  yearBoundary: 'TET',
  trigrams: BAT_TRACH_1_0.trigrams.map((trigram) => ({ ...trigram, home: HOME[trigram.number] })),
  text: { ...BAT_TRACH_1_0.text, interpretation: 'orientation:profiles.batTrach.interpretationV1_1' },
}

export const RULE_PROFILES: RuleProfile[] = [BAT_TRACH_1_0, BAT_TRACH_1_1]

export const CURRENT_RULE_PROFILE = RULE_PROFILES[RULE_PROFILES.length - 1]
