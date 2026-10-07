import type { ParseKeys } from 'i18next'

/** Nhóm phép tính — mỗi nhóm một đơn vị kết quả. */
export type CalcGroup = 'area' | 'volume' | 'mass'

/** Nhãn trong cấu hình là khoá i18n: hằng nạp từ lúc import, khi đó chưa dịch được. */
type UtilityKey = ParseKeys<'utility'>

export interface CalcInput {
  key: string
  label: UtilityKey
  /** Đơn vị người dùng nhập, in sau ô. */
  unit: string
}

export interface CalcPreset {
  label: UtilityKey
  /** Giá trị điền sẵn vào ô, viết kiểu người gõ ("7850"). */
  values: Record<string, string>
}

export interface CalcFormula {
  id: string
  group: CalcGroup
  label: UtilityKey
  inputs: CalcInput[]
  presets?: CalcPreset[]
  compute: (values: Record<string, number>) => number
  /** Phép tính in ra cho người dùng soát, dựng từ các số ĐÃ định dạng. */
  explain: (values: Record<string, string>) => string
}

export const CALC_GROUPS: { value: CalcGroup; label: UtilityKey; icon: string; unit: string }[] = [
  { value: 'area', label: 'quickCalc.groups.area', icon: 'bounding-box', unit: 'm²' },
  { value: 'volume', label: 'quickCalc.groups.volume', icon: 'box', unit: 'm³' },
  { value: 'mass', label: 'quickCalc.groups.mass', icon: 'box-seam', unit: 'kg' },
]

/** Khối lượng riêng của thép xây dựng, kg/m³ (TCVN 1651). */
export const STEEL_DENSITY = 7850

const m = (key: string, label: UtilityKey): CalcInput => ({ key, label, unit: 'm' })

/**
 * Chiều dài nhập bằng MÉT ở mọi công thức; riêng đường kính thép và bề dày thép
 * tấm bằng mm — đúng đơn vị ghi trên bản vẽ và phiếu vật tư.
 */
export const CALC_FORMULAS: CalcFormula[] = [
  {
    id: 'rectangle',
    group: 'area',
    label: 'quickCalc.formulas.rectangle',
    inputs: [m('a', 'quickCalc.inputs.length'), m('b', 'quickCalc.inputs.width')],
    compute: ({ a, b }) => a * b,
    explain: ({ a, b }) => `${a} × ${b}`,
  },
  {
    id: 'triangle',
    group: 'area',
    label: 'quickCalc.formulas.triangle',
    inputs: [m('a', 'quickCalc.inputs.base'), m('h', 'quickCalc.inputs.height')],
    compute: ({ a, h }) => (a * h) / 2,
    explain: ({ a, h }) => `${a} × ${h} ÷ 2`,
  },
  {
    id: 'trapezoid',
    group: 'area',
    label: 'quickCalc.formulas.trapezoid',
    inputs: [m('a', 'quickCalc.inputs.bigBase'), m('b', 'quickCalc.inputs.smallBase'), m('h', 'quickCalc.inputs.height')],
    compute: ({ a, b, h }) => ((a + b) / 2) * h,
    explain: ({ a, b, h }) => `(${a} + ${b}) ÷ 2 × ${h}`,
  },
  {
    id: 'circle',
    group: 'area',
    label: 'quickCalc.formulas.circle',
    inputs: [m('d', 'quickCalc.inputs.diameter')],
    compute: ({ d }) => (Math.PI * d * d) / 4,
    explain: ({ d }) => `π × ${d}² ÷ 4`,
  },
  {
    id: 'box',
    group: 'volume',
    label: 'quickCalc.formulas.box',
    inputs: [m('a', 'quickCalc.inputs.length'), m('b', 'quickCalc.inputs.width'), m('h', 'quickCalc.inputs.heightThickness')],
    compute: ({ a, b, h }) => a * b * h,
    explain: ({ a, b, h }) => `${a} × ${b} × ${h}`,
  },
  {
    id: 'cylinder',
    group: 'volume',
    label: 'quickCalc.formulas.cylinder',
    inputs: [m('d', 'quickCalc.inputs.diameter'), m('h', 'quickCalc.inputs.heightLength')],
    compute: ({ d, h }) => ((Math.PI * d * d) / 4) * h,
    explain: ({ d, h }) => `π × ${d}² ÷ 4 × ${h}`,
  },
  {
    id: 'rebar',
    group: 'mass',
    label: 'quickCalc.formulas.rebar',
    inputs: [
      { key: 'd', label: 'quickCalc.inputs.diameter', unit: 'mm' },
      { key: 'l', label: 'quickCalc.inputs.length', unit: 'm' },
    ],
    // Tiết diện π·d²/4 (mm²) × 7.850 kg/m³ = d² × 0,006165 kg cho mỗi mét.
    compute: ({ d, l }) => ((Math.PI * d * d) / 4 / 1_000_000) * STEEL_DENSITY * l,
    explain: ({ d, l }) => `${d}² × 0,006165 × ${l}`,
  },
  {
    id: 'plate',
    group: 'mass',
    label: 'quickCalc.formulas.plate',
    inputs: [m('a', 'quickCalc.inputs.length'), m('b', 'quickCalc.inputs.width'), { key: 't', label: 'quickCalc.inputs.thickness', unit: 'mm' }],
    compute: ({ a, b, t }) => a * b * (t / 1000) * STEEL_DENSITY,
    explain: ({ a, b, t }) => `${a} × ${b} × ${t} ÷ 1000 × 7.850`,
  },
  {
    id: 'density',
    group: 'mass',
    label: 'quickCalc.formulas.density',
    inputs: [
      { key: 'v', label: 'quickCalc.inputs.volume', unit: 'm³' },
      { key: 'p', label: 'quickCalc.inputs.density', unit: 'kg/m³' },
    ],
    presets: [
      { label: 'quickCalc.presets.steel', values: { p: '7850' } },
      { label: 'quickCalc.presets.reinforcedConcrete', values: { p: '2500' } },
      { label: 'quickCalc.presets.water', values: { p: '1000' } },
    ],
    compute: ({ v, p }) => v * p,
    explain: ({ v, p }) => `${v} × ${p}`,
  },
]
