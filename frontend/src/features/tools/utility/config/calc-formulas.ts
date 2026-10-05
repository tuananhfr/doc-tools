/** Nhóm phép tính — mỗi nhóm một đơn vị kết quả. */
export type CalcGroup = 'area' | 'volume' | 'mass'

export interface CalcInput {
  key: string
  label: string
  /** Đơn vị người dùng nhập, in sau ô. */
  unit: string
}

export interface CalcPreset {
  label: string
  /** Giá trị điền sẵn vào ô, viết kiểu người gõ ("7850"). */
  values: Record<string, string>
}

export interface CalcFormula {
  id: string
  group: CalcGroup
  label: string
  inputs: CalcInput[]
  presets?: CalcPreset[]
  compute: (values: Record<string, number>) => number
  /** Phép tính in ra cho người dùng soát, dựng từ các số ĐÃ định dạng. */
  explain: (values: Record<string, string>) => string
}

export const CALC_GROUPS: { value: CalcGroup; label: string; icon: string; unit: string }[] = [
  { value: 'area', label: 'Diện tích', icon: 'bounding-box', unit: 'm²' },
  { value: 'volume', label: 'Thể tích', icon: 'box', unit: 'm³' },
  { value: 'mass', label: 'Khối lượng', icon: 'box-seam', unit: 'kg' },
]

/** Khối lượng riêng của thép xây dựng, kg/m³ (TCVN 1651). */
export const STEEL_DENSITY = 7850

const m = (key: string, label: string): CalcInput => ({ key, label, unit: 'm' })

/**
 * Chiều dài nhập bằng MÉT ở mọi công thức; riêng đường kính thép và bề dày thép
 * tấm bằng mm — đúng đơn vị ghi trên bản vẽ và phiếu vật tư.
 */
export const CALC_FORMULAS: CalcFormula[] = [
  {
    id: 'rectangle',
    group: 'area',
    label: 'Hình chữ nhật',
    inputs: [m('a', 'Chiều dài'), m('b', 'Chiều rộng')],
    compute: ({ a, b }) => a * b,
    explain: ({ a, b }) => `${a} × ${b}`,
  },
  {
    id: 'triangle',
    group: 'area',
    label: 'Hình tam giác',
    inputs: [m('a', 'Cạnh đáy'), m('h', 'Chiều cao')],
    compute: ({ a, h }) => (a * h) / 2,
    explain: ({ a, h }) => `${a} × ${h} ÷ 2`,
  },
  {
    id: 'trapezoid',
    group: 'area',
    label: 'Hình thang',
    inputs: [m('a', 'Đáy lớn'), m('b', 'Đáy nhỏ'), m('h', 'Chiều cao')],
    compute: ({ a, b, h }) => ((a + b) / 2) * h,
    explain: ({ a, b, h }) => `(${a} + ${b}) ÷ 2 × ${h}`,
  },
  {
    id: 'circle',
    group: 'area',
    label: 'Hình tròn',
    inputs: [m('d', 'Đường kính')],
    compute: ({ d }) => (Math.PI * d * d) / 4,
    explain: ({ d }) => `π × ${d}² ÷ 4`,
  },
  {
    id: 'box',
    group: 'volume',
    label: 'Khối hộp (móng, dầm, sàn)',
    inputs: [m('a', 'Chiều dài'), m('b', 'Chiều rộng'), m('h', 'Chiều cao / dày')],
    compute: ({ a, b, h }) => a * b * h,
    explain: ({ a, b, h }) => `${a} × ${b} × ${h}`,
  },
  {
    id: 'cylinder',
    group: 'volume',
    label: 'Khối trụ (cột tròn, cọc)',
    inputs: [m('d', 'Đường kính'), m('h', 'Chiều cao / dài')],
    compute: ({ d, h }) => ((Math.PI * d * d) / 4) * h,
    explain: ({ d, h }) => `π × ${d}² ÷ 4 × ${h}`,
  },
  {
    id: 'rebar',
    group: 'mass',
    label: 'Thép tròn (thép cây)',
    inputs: [
      { key: 'd', label: 'Đường kính', unit: 'mm' },
      { key: 'l', label: 'Chiều dài', unit: 'm' },
    ],
    // Tiết diện π·d²/4 (mm²) × 7.850 kg/m³ = d² × 0,006165 kg cho mỗi mét.
    compute: ({ d, l }) => ((Math.PI * d * d) / 4 / 1_000_000) * STEEL_DENSITY * l,
    explain: ({ d, l }) => `${d}² × 0,006165 × ${l}`,
  },
  {
    id: 'plate',
    group: 'mass',
    label: 'Thép tấm',
    inputs: [m('a', 'Chiều dài'), m('b', 'Chiều rộng'), { key: 't', label: 'Bề dày', unit: 'mm' }],
    compute: ({ a, b, t }) => a * b * (t / 1000) * STEEL_DENSITY,
    explain: ({ a, b, t }) => `${a} × ${b} × ${t} ÷ 1000 × 7.850`,
  },
  {
    id: 'density',
    group: 'mass',
    label: 'Thể tích × khối lượng riêng',
    inputs: [
      { key: 'v', label: 'Thể tích', unit: 'm³' },
      { key: 'p', label: 'Khối lượng riêng', unit: 'kg/m³' },
    ],
    presets: [
      { label: 'Thép', values: { p: '7850' } },
      { label: 'Bê tông cốt thép', values: { p: '2500' } },
      { label: 'Nước', values: { p: '1000' } },
    ],
    compute: ({ v, p }) => v * p,
    explain: ({ v, p }) => `${v} × ${p}`,
  },
]
