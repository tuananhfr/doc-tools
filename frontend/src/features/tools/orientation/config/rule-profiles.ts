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
  name: 'Bát trạch (cung phi theo năm sinh)',
  sourceReference: 'Bát Trạch Minh Kính — phép Du niên; cung phi theo Lạc thư, năm sinh âm lịch',
  inputSchema: { year: { min: 1900, max: 2100, calendar: 'LUNAR' }, sex: true },
  segments: ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'],
  kua: {
    modulus: 9,
    male: { add: 11, sign: -1, fiveAs: 2 },
    female: { add: 4, sign: 1, fiveAs: 8 },
    zeroAs: 9,
  },
  groups: [
    { id: 'EAST', name: 'Đông tứ mệnh' },
    { id: 'WEST', name: 'Tây tứ mệnh' },
  ],
  stars: [
    { id: 'SINH_KHI', name: 'Sinh khí', fortune: 'GOOD', rank: 1, meaning: 'Tốt nhất — vượng tài lộc, danh tiếng, thăng tiến' },
    { id: 'THIEN_Y', name: 'Thiên y', fortune: 'GOOD', rank: 2, meaning: 'Tốt cho sức khoẻ, có quý nhân giúp đỡ' },
    { id: 'DIEN_NIEN', name: 'Diên niên', fortune: 'GOOD', rank: 3, meaning: 'Gia đạo hoà thuận, quan hệ bền lâu' },
    { id: 'PHUC_VI', name: 'Phục vị', fortune: 'GOOD', rank: 4, meaning: 'Bình yên, vững tinh thần, thuận học hành' },
    { id: 'TUYET_MENH', name: 'Tuyệt mệnh', fortune: 'BAD', rank: 1, meaning: 'Xấu nhất — hao tổn, bệnh tật' },
    { id: 'NGU_QUY', name: 'Ngũ quỷ', fortune: 'BAD', rank: 2, meaning: 'Thị phi, mất mát, việc bất ngờ' },
    { id: 'LUC_SAT', name: 'Lục sát', fortune: 'BAD', rank: 3, meaning: 'Xáo trộn quan hệ, kiện tụng' },
    { id: 'HOA_HAI', name: 'Họa hại', fortune: 'BAD', rank: 4, meaning: 'Gặp chuyện không may, thất bại nhỏ' },
  ],
  trigrams: [
    { number: 1, name: 'Khảm', element: 'Thuỷ', group: 'EAST', stars: { SINH_KHI: 3, THIEN_Y: 2, DIEN_NIEN: 4, PHUC_VI: 0, HOA_HAI: 6, NGU_QUY: 1, LUC_SAT: 7, TUYET_MENH: 5 } },
    { number: 2, name: 'Khôn', element: 'Thổ', group: 'WEST', stars: { SINH_KHI: 1, THIEN_Y: 6, DIEN_NIEN: 7, PHUC_VI: 5, HOA_HAI: 2, NGU_QUY: 3, LUC_SAT: 4, TUYET_MENH: 0 } },
    { number: 3, name: 'Chấn', element: 'Mộc', group: 'EAST', stars: { SINH_KHI: 4, THIEN_Y: 0, DIEN_NIEN: 3, PHUC_VI: 2, HOA_HAI: 5, NGU_QUY: 7, LUC_SAT: 1, TUYET_MENH: 6 } },
    { number: 4, name: 'Tốn', element: 'Mộc', group: 'EAST', stars: { SINH_KHI: 0, THIEN_Y: 4, DIEN_NIEN: 2, PHUC_VI: 3, HOA_HAI: 7, NGU_QUY: 5, LUC_SAT: 6, TUYET_MENH: 1 } },
    { number: 6, name: 'Càn', element: 'Kim', group: 'WEST', stars: { SINH_KHI: 6, THIEN_Y: 1, DIEN_NIEN: 5, PHUC_VI: 7, HOA_HAI: 3, NGU_QUY: 2, LUC_SAT: 0, TUYET_MENH: 4 } },
    { number: 7, name: 'Đoài', element: 'Kim', group: 'WEST', stars: { SINH_KHI: 7, THIEN_Y: 5, DIEN_NIEN: 1, PHUC_VI: 6, HOA_HAI: 0, NGU_QUY: 4, LUC_SAT: 3, TUYET_MENH: 2 } },
    { number: 8, name: 'Cấn', element: 'Thổ', group: 'WEST', stars: { SINH_KHI: 5, THIEN_Y: 7, DIEN_NIEN: 6, PHUC_VI: 1, HOA_HAI: 4, NGU_QUY: 0, LUC_SAT: 2, TUYET_MENH: 3 } },
    { number: 9, name: 'Ly', element: 'Hoả', group: 'EAST', stars: { SINH_KHI: 2, THIEN_Y: 3, DIEN_NIEN: 0, PHUC_VI: 4, HOA_HAI: 1, NGU_QUY: 6, LUC_SAT: 5, TUYET_MENH: 7 } },
  ],
  interpretation:
    'Cung phi tính theo năm sinh âm lịch và giới tính. Hướng của đối tượng rơi vào cung nào trong 8 cung của người đó thì mang sao đó. Sinh trước Tết Nguyên đán thì dùng năm âm lịch là năm trước.',
  disclaimer:
    'Phần này là tham khảo theo phong thuỷ dân gian (phép Bát trạch), không phải kết luận kỹ thuật hay lời khuyên chuyên môn. Trường phái khác có thể cho kết quả khác. Số đo hướng ở phần Kết quả đo không phụ thuộc phần này.',
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
  interpretation:
    'Cung mệnh tính theo năm sinh âm lịch (đổi năm ở Tết Nguyên đán) và giới tính. Hướng của đối tượng rơi vào cung nào trong 8 cung của người đó thì mang sao đó. Nhà còn được xếp Đông / Tây tứ trạch theo hướng toạ (phía sau nhà); trường phái lấy mốc năm Lập Xuân (khoảng 4/2) có thể cho cung khác với người sinh giữa hai mốc.',
}

export const RULE_PROFILES: RuleProfile[] = [BAT_TRACH_1_0, BAT_TRACH_1_1]

export const CURRENT_RULE_PROFILE = RULE_PROFILES[RULE_PROFILES.length - 1]
